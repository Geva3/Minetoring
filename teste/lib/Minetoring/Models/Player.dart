class ServerData {
  List<Player> players;

  ServerData({this.players});

  factory ServerData.fromJson(Map<String, dynamic> info) {
    var players = info['players'] as List;
    List<Player> playerList;
    if (players != null) {
      playerList = players.map((i) => Player.fromJson(i)).toList();
    }

    playerList.sort((Player a, Player b) => a.name.compareTo(b.name));

    return ServerData(
      players: playerList
    );
  }
}

class Player {
  String uuid;
  String name;
  String face;
  Coordinates spawn;
  Coordinates pos;
  List<Item> inventory;
  var selectedSlot;
  List<Item> endChest;
  var health;
  var dimension;
  var xp;

  Player({
    this.uuid,
    this.name,
    this.face,
    this.spawn,
    this.pos,
    this.inventory,
    this.selectedSlot,
    this.endChest,
    this.health,
    this.dimension,
    this.xp
  });

  factory Player.fromJson(Map<String, dynamic> info) {
    var inventory = info['inventory'] as List;
    List<Item> inventoryList;
    if (inventory != null) {
      inventoryList = inventory.map((i) => Item.fromJson(i)).toList();
    }

    var endChest = info['Enchantments'] as List;
    List<Item> endChestList;
    if (endChest != null) {
      endChestList = endChest.map((i) => Item.fromJson(i)).toList();
    }
    return Player(
      uuid: info['uuid'],
      name: info['name'],
      face: info['face'],
      spawn: Coordinates.fromJson(info['spawn']),
      pos: Coordinates.fromJson(info['pos']),
      inventory: inventoryList,
      selectedSlot: info['selectedSlot'],
      endChest: endChestList,
      health: info['health'],
      dimension: info['dimension'],
      xp: info['xp']
    );
  }
}

class Coordinates {
  var x;
  var y;
  var z;

  Coordinates({this.x, this.y, this.z});

  factory Coordinates.fromJson(Map<String, dynamic> info) {
    return Coordinates(x: info['x'], y: info['y'], z: info['z']);
  }
}

class Item {
  var slot;
  String id;
  var amount;
  NBT tag;

  Item({this.slot, this.id, this.amount, this.tag});

  factory Item.fromJson(Map<String, dynamic> info) {
    return Item(
        slot: info['Slot'],
        id: info['id'],
        amount: info['Count'],
        tag: info['tag'] != null ? NBT.fromJson(info['tag']) : null
    );
  }
}

class NBT {
  List<Enchantment> enchantments;
  var damage;

  NBT({this.enchantments, this.damage});

  factory NBT.fromJson(Map<String, dynamic> info) {
    List<Enchantment> enchantmentList;
    if(info != null && info['Enchantments'] != null) {
      var list = info['Enchantments'] as List;
      if (list != null) {
        enchantmentList = list.map((i) => Enchantment.fromJson(i)).toList();
      }
    }

    return NBT(enchantments: enchantmentList, damage: info['Damage']);
  }
}

class Enchantment {
  var level;
  String id;

  Enchantment({this.level, this.id});

  factory Enchantment.fromJson(Map<String, dynamic> info) {
    return Enchantment(level: info['lvl'], id: info['id']);
  }
}
