import 'package:flutter/material.dart';
import './Minetoring/Models/Player.dart';
import 'dart:convert';

class PlayerView extends StatelessWidget {
  PlayerView({Key key, this.title, this.inventory}) : super(key: key);

  final String title;
  final List<Item> inventory;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Minetoring',
        theme: ThemeData(
          primarySwatch: Colors.green,
        ),
        home: PlayerBuilder(
          title: title,
          inventory: inventory,
        ));
  }
}

class PlayerBuilder extends StatelessWidget {
  PlayerBuilder({Key key, this.title, this.inventory}) : super(key: key);

  final String title;
  final List<Item> inventory;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: Center(
        child: Column(
          children: <Widget>[
            Stack(
              alignment: Alignment.center,
              children: <Widget>[
                Image.asset(
                  "lib/assets/img/inventory.png",
                  fit: BoxFit.contain,
                ),
                Container(
                  padding: EdgeInsets.all((MediaQuery.of(context).size.width - 352)/2 + 15),
                  child: Column(
                    children: <Widget>[
                      createRow(0, 0),
                      createRow(4, 1),
                      createRow(4, 2),
                      createRow(4, 3),
                      createRow(12, 4),
                      createRow(4, 5),
                      createRow(4, 6),
                      createRow(12, 7),
                    ],
                  ),
                )
              ],
            ),
          ],
        ),
      ),
    );
  }

  Container createRow(double padding, row) {
    Row line;

    if(row < 3) {
      Item item = inventory.singleWhere((item) => item.slot == 103-row, orElse: () => null);
      line = Row(
          children: <Widget>[
            Stack(
              children: <Widget>[
                item != null ? Image.asset(
                  "lib/assets/img/inventory_background.png",
                  fit: BoxFit.contain,
                ) : Container(height: 32, width: 32),
                createImage(item)
              ],
            )
          ]
      );
    } else if (row == 3) {
      Item item100 = inventory.singleWhere((item) => item.slot == 100, orElse: () => null);
      Item item106 = inventory.singleWhere((item) => item.slot == -106, orElse: () => null);
      line = Row(
        children: <Widget>[
          Stack(
            children: <Widget>[
              item100 != null ? Image.asset(
                "lib/assets/img/inventory_background.png",
                fit: BoxFit.contain,
              ) : Container(height: 32, width: 32),
              createImage(item100)
            ],
          ),
          Container(
            padding: EdgeInsets.only(left: 105),
            child: Stack(
              children: <Widget>[
                item106 != null ? Image.asset(
                  "lib/assets/img/inventory_background.png",
                  fit: BoxFit.contain,
                ) : Container(height: 32, width: 32),
                createImage(item106)
              ],
            )
          )
        ],
      );
    } else {
      Item item0 = inventory.singleWhere((item) => item.slot == (row - 3)%4 * 9, orElse: () => null);
      Item item1 = inventory.singleWhere((item) => item.slot == (row - 3)%4 * 9 + 1, orElse: () => null);
      Item item2 = inventory.singleWhere((item) => item.slot == (row - 3)%4 * 9 + 2, orElse: () => null);
      Item item3 = inventory.singleWhere((item) => item.slot == (row - 3)%4 * 9 + 3, orElse: () => null);
      Item item4 = inventory.singleWhere((item) => item.slot == (row - 3)%4 * 9 + 4, orElse: () => null);
      Item item5 = inventory.singleWhere((item) => item.slot == (row - 3)%4 * 9 + 5, orElse: () => null);
      Item item6 = inventory.singleWhere((item) => item.slot == (row - 3)%4 * 9 + 6, orElse: () => null);
      Item item7 = inventory.singleWhere((item) => item.slot == (row - 3)%4 * 9 + 7, orElse: () => null);
      Item item8 = inventory.singleWhere((item) => item.slot == (row - 3)%4 * 9 + 8, orElse: () => null);
      line = Row(
        children: <Widget>[
          createImage(item0),
          Container(
            padding: EdgeInsets.only(left: 4),
            child: createImage(item1)
          ),
          Container(
              padding: EdgeInsets.only(left: 4),
              child: createImage(item2)
          ),
          Container(
              padding: EdgeInsets.only(left: 4),
              child: createImage(item3)
          ),
          Container(
              padding: EdgeInsets.only(left: 4),
              child: createImage(item4)
          ),
          Container(
              padding: EdgeInsets.only(left: 4),
              child: createImage(item5)
          ),
          Container(
              padding: EdgeInsets.only(left: 4),
              child: createImage(item6)
          ),
          Container(
              padding: EdgeInsets.only(left: 4),
              child: createImage(item7)
          ),
          Container(
              padding: EdgeInsets.only(left: 4),
              child: createImage(item8)
          )
        ],
      );
    }

    return Container(
      padding: EdgeInsets.only(top: padding),
      child: line
    );
  }
  
  Object createImage(item) {
    List<Widget> children = [];
    if(item != null && !item.id.startsWith('minecraft:')) {
      var mappings = [
        "lib/assets/img/0.png",
        "lib/assets/img/1.png",
        "lib/assets/img/2.png",
        "lib/assets/img/3.png",
        "lib/assets/img/4.png",
        "lib/assets/img/5.png",
        "lib/assets/img/6.png",
        "lib/assets/img/7.png",
        "lib/assets/img/8.png",
        "lib/assets/img/9.png"
      ];

      String unity = mappings[item.amount % 10];
      String ten = mappings[(item.amount / 10).floor()];

      children = [
        Image.memory(base64Decode(item.id),
            height: 32, width: 32, fit: BoxFit.contain),
      ];

      if (item.amount > 1) {
        children.add(Container(
            padding: EdgeInsets.only(left: 22, top: 18),
            child: Image.asset(unity, height: 14, width: 10, fit: BoxFit.fill,)
        ));
      }

      if(item.amount > 9) {
        children.add(Container(
            padding: EdgeInsets.only(left: 11, top: 18),
            child: Image.asset(ten, height: 14, width: 10, fit: BoxFit.fill,)
        ));
      }
    }

    return item != null && !item.id.startsWith('minecraft:') ? Stack(
        children: children,
    ) : Container(height: 32, width: 32);
  }
}
