import 'package:http/http.dart' as http;
import './Models/Player.dart';
import 'dart:convert';

class Api {
  static Future<ServerData> getServerInfo() async {
//    final response = await http.get('http://192.168.43.145:7001/server/info');
    final response = await http.get('http://localhost:7001/server/info');

    if(response.statusCode == 200) {
      return ServerData.fromJson(json.decode(response.body));
    } else {
      throw Exception('Failed to get server info');
    }
  }
}