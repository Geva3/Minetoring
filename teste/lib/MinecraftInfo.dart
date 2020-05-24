import 'dart:io';
import 'dart:convert' show utf8, json;
import 'dart:typed_data';
import 'dart:async';

class MinecraftInfo {
  Description description;
  Players players;
  Version version;

  MinecraftInfo({this.description, this.players, this.version});

  factory MinecraftInfo.fromJson(Map<String, dynamic> info) {
    return MinecraftInfo(
      description: Description.fromJson(info['description']),
      players: Players.fromJson(info['players']),
      version: Version.fromJson(info['version'])
    );
  }
}

class Description {
  String text;

  Description({this.text});

  factory Description.fromJson(Map<String, dynamic> description) {
    return Description(
      text: description['text']
    );
  }
}

class Players {
  int max;
  int online;
  List<Sample> samples;

  Players({this.max, this.online, this.samples});

  factory Players.fromJson(Map<String, dynamic> players) {
    var list = players['sample'] as List;
    List<Sample> sampleList;
    if(list != null) {
      sampleList = list.map((i) => Sample.fromJson(i)).toList();
    }

    return Players(
      online: players['online'],
      max: players['max'],
      samples: sampleList
    );
  }
}

class Sample {
  String id;
  String name;

  Sample({this.id, this.name});

  factory Sample.fromJson(Map<String, dynamic> sample) {
    return Sample(
      id: sample['id'],
      name: sample['name']
    );
  }
}

class Version {
  String name;
  int protocol;

  Version({this.name, this.protocol});

  factory Version.fromJson(Map<String, dynamic> version) {
    return Version(
      name: version['name'],
      protocol: version['protocol']
    );
  }
}

class Ping {
  static const PACKET_HANDSHAKE = 0x00, PACKET_STATUS_REQUEST = 0x00, PACKET_PING = 0x01;
  static const PROTOCOL_VERSION = 485;
  static const STATUS_HANDSHAKE = 1;
  static var jsonParsed;
  Completer<MinecraftInfo> completer;

  void dataHandler(data){
    var datainfo = readVarInt(data);
    var length = datainfo[0];
    var newData = data.sublist(datainfo[1], length + datainfo[1]);
    if(newData[0] == 0) {
      newData = newData.sublist(1);
      var messageinfo = readVarInt(newData);
      var message = newData.sublist(messageinfo[1]);
      jsonParsed = json.decode(new String.fromCharCodes(message));
    } else if(newData[0] == 1) {
      newData = newData.sublist(1);
      var messageinfo = readVarInt(newData);
      var message = newData.sublist(messageinfo[1]);
      int total = 0;
      for(int i in message) {
        total <<= 8;
        total += i;
      }
      print(total);
    }
    if(data.length > (length + datainfo[1])) {
      var dataDoidona = data.sublist(length + datainfo[1]);
      dataHandler(dataDoidona);
    }
  }

  Future<MinecraftInfo> ping(String hostname, int port) {
    completer = new Completer();
    Socket.connect(hostname, port).then((Socket so) async {
      so.asBroadcastStream(onListen: dataHandler);
      so.listen(dataHandler, onDone: () {
        so.destroy();
        completer.complete(MinecraftInfo.fromJson(jsonParsed));
      }, cancelOnError: false);

      int length = 0;

      length += 1;
      length += getVarIntLength(PROTOCOL_VERSION);
      length += getVarIntLength(hostname.length);
      length += Uint8List.fromList(utf8.encode(hostname)).length;
      length += 2;
      length += 1;

      writeVarInt(so, length); // Comprimento da mensagem
      so.add([PACKET_HANDSHAKE]);  // 0 to handshake
      writeVarInt(so, PROTOCOL_VERSION); // 1.14.2 -> 485
      writeVarInt(so, hostname.length); // Comprimento do hostname
      so.add(Uint8List.fromList(utf8.encode(hostname))); // hostname
      so.add([port & 0x00FF, port >> 8]); // porta
      writeVarInt(so, STATUS_HANDSHAKE); // 1 para status

      so.add([1]);
      so.add([PACKET_STATUS_REQUEST]); // 0 to request

      writeVarInt(so, DateTime.now().millisecondsSinceEpoch.toString().length - 4);
      so.add([PACKET_PING]); // 1 to ping
      so.write(DateTime.now().millisecondsSinceEpoch); // any long
      print(DateTime.now().millisecondsSinceEpoch);
    });
    return completer.future;
  }

  static readVarInt(array) {
    int i = 0;
    int j = 0;
    while (true) {
      int k = array[j];
      i |= (k & 0x7F) << j++ * 7;
      if (j > 5)
        return -1;
      if ((k & 0x80) != 128)
        break;
    }
    return [i, j];
  }

  static int getVarIntLength(int paramInt) {
    int length = 0;
    while (true) {
      if ((paramInt & 0xFFFFFF80) == 0) {
        length++;
        return length;
      }
      length++;
      paramInt >>= 7;
    }
  }

  static void writeVarInt(Socket out, int paramInt) {
    while (true) {
      if ((paramInt & 0xFFFFFF80) == 0) {
        out.add([paramInt]);
        return;
      }
      out.add([paramInt & 0x7F | 0x80]);
      paramInt >>= 7;
    }
  }
}