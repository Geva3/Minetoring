import 'package:flutter/material.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:image/image.dart' as Crazy;
import 'dart:typed_data';
import 'dart:convert';
import './MinecraftInfo.dart';
import './Minetoring/Api.dart';
import './Minetoring/Models/Player.dart';
import './PlayerView.dart';

void main() => runApp(MyApp());

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Minetoring',
      theme: ThemeData(
        primarySwatch: Colors.green,
      ),
      home: MyHomePage(title: 'Monitoring server'),
    );
  }
}

class MyHomePage extends StatefulWidget {
  MyHomePage({Key key, this.title}) : super(key: key);

  final String title;

  @override
  _MyHomePageState createState() => _MyHomePageState();
}

class _MyHomePageState extends State<MyHomePage> {
  FlutterLocalNotificationsPlugin plugin =
      new FlutterLocalNotificationsPlugin();
  static var androidPlatformChannelSpecifics = AndroidNotificationDetails(
      'your channel id', 'your channel name', 'your channel description',
      importance: Importance.Max,
      priority: Priority.High,
      ongoing: true);
  static var iOSPlatformChannelSpecifics = IOSNotificationDetails();
  var platformChannelSpecifics = NotificationDetails(
      androidPlatformChannelSpecifics, iOSPlatformChannelSpecifics);

  static const HOSTNAME = "35.247.201.229";
  static const int PORT = 25565;
  MinecraftInfo info;
  Map<String, String> onlinePlayers = new Map();
  Ping ping = new Ping();

  ServerData serverData;

  _MyHomePageState() {
    var initializationSettingsAndroid =
        new AndroidInitializationSettings("diamond");
    var initializationSettingsIOS = new IOSInitializationSettings();
    var initializationSettings = new InitializationSettings(
        initializationSettingsAndroid, initializationSettingsIOS);
    plugin.initialize(initializationSettings);

    //const oneSec = const Duration(seconds: 15);
    //new Timer.periodic(oneSec, (Timer t) => generateNotification());
  }

  void onPressed() {
    ping.ping(HOSTNAME, PORT).then((MinecraftInfo info) {
      setState(() {
        this.info = info;
        onlinePlayers?.clear();
        if (info.players.samples != null) {
          for (Sample sample in info.players.samples) {
            onlinePlayers[sample.id] = sample.name;
          }
        }
      });
      return Api.getServerInfo();
    }).then((data) => {
      if(data != serverData) {
        setState(() {
          serverData = data;
        })
      }
    });
  }

  void generateNotification() {
    onPressed();
    if (onlinePlayers != null && onlinePlayers.length > 0) {
      String text = "";
      onlinePlayers.forEach((key, value) => text += value + ", ");
      if(text.contains(", ")) {
        text = text.replaceFirst(new RegExp(", \$"), "");
      }
      plugin.show(
          0,
          "Minecraft Monitoring Status",
          "Players online: " + text,
          platformChannelSpecifics);
    } else {
      plugin.cancel(0);
    }
  }

  Uint8List decodeImage(String base64, int scale) {
    Crazy.Image img = Crazy.decodePng(base64Decode(base64));
    img = Crazy.copyResize(img, width: 8*scale, height: 8*scale, interpolation: Crazy.Interpolation.cubic);
    img = Crazy.pixelate(img, scale);
    return Crazy.encodePng(img, level: 0);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.title),
      ),
      body: Center(
        child: Column(
          children: <Widget>[
            FutureBuilder<MinecraftInfo> (
              future: ping.ping(HOSTNAME, PORT),
                builder: (context, snapshot) {
                  if(snapshot.hasData) {
                    return Padding(
                        padding: EdgeInsets.all(16),
                        child: Text('Temos ' + snapshot.data.players.online.toString() +
                                ' jogadores online em ' + snapshot.data.description.text,
                            style: new TextStyle(fontSize: 20),
                            textAlign: TextAlign.left));
                  } else {
                    return CircularProgressIndicator();
                  }
                }
            ),
            serverData != null ? Expanded(
                    child: ListView.builder(
                      itemCount: serverData.players.length,
                      itemBuilder: (context, index) {
                        return ListTile(
                          onTap: () => Navigator.push(context, MaterialPageRoute(builder: (context) => PlayerView(
                              title: serverData.players[index].name,
                              inventory: serverData.players[index].inventory,
                          ))),
                            title: Row(
                                mainAxisAlignment: MainAxisAlignment.start,
                                mainAxisSize: MainAxisSize.max,
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: <Widget>[
                                  Container(
                                      padding: EdgeInsets.only(right: 9),
                                      child: Image.memory(decodeImage(serverData.players[index].face, 3),
                                        height: 24, width: 24, fit: BoxFit.contain),
                                  ),
                                  Text(serverData.players[index].name,
                                      style: TextStyle(fontSize: 18),
                                      textAlign: TextAlign.left),
                                  Container(
                                      padding: EdgeInsets.only(left: 9, top: 8),
                                      child: Image.asset(
                                        onlinePlayers != null  && onlinePlayers[serverData.players[index].uuid] != null
                                            ? "lib/assets/img/online.png"
                                            : "lib/assets/img/offline.png",
                                        height: 9,
                                        width: 9,
                                      )
                                  )
                                ]
                            )
                        );
                      },
                    ),
                  ) : Container(),
          ],
        ),
      ),
      floatingActionButton: new FloatingActionButton(
        onPressed: onPressed,
        child: new Container(
          child: new Image.asset("lib/assets/img/diamond.png"),
          padding: EdgeInsets.all(12),
        ),
      ),
    );
  }
}
