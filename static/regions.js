// O'zbekiston viloyatlari, tumanlari va mahallalari
const regions = {
  "Toshkent shahri": {
    districts: {
      "Bektemir": ["Hamma", "Bektemir-1", "Bektemir-2"],
      "Chilonzor": ["Hamma", "Chilonzor-1", "Chilonzor-2", "Chilonzor-3"],
      "Yunusobod": ["Hamma", "Yunusobod-1", "Yunusobod-2", "Yunusobod-3", "Yunusobod-4"],
      "Mirzo Ulug'bek": ["Hamma", "Mirzo-1", "Mirzo-2", "Mirzo-3"],
      "Olmazor": ["Hamma", "Olmazor-1", "Olmazor-2"],
      "Sergeli": ["Hamma", "Sergeli-1", "Sergeli-2"],
      "Uchtepa": ["Hamma", "Uchtepa-1", "Uchtepa-2"],
      "Yakkasaroy": ["Hamma", "Yakkasaroy-1", "Yakkasaroy-2"],
      "Shayxontohur": ["Hamma", "Shayxontohur-1", "Shayxontohur-2"]
    }
  },
  "Toshkent viloyati": {
    districts: {
      "Angren": ["Hamma", "Angren-1", "Angren-2"],
      "Bekobod": ["Hamma", "Bekobod-1", "Bekobod-2"],
      "Bo'ka": ["Hamma", "Bo'ka-1"],
      "Chinoz": ["Hamma", "Chinoz-1"],
      "Qibray": ["Hamma", "Qibray-1", "Qibray-2"],
      "Ohangaron": ["Hamma", "Ohangaron-1"],
      "Oqqo'rg'on": ["Hamma", "Oqqo'rg'on-1"],
      "Parkent": ["Hamma", "Parkent-1"],
      "Piskent": ["Hamma", "Piskent-1"],
      "Quyi Chirchiq": ["Hamma", "Quyi Chirchiq-1"],
      "O'rta Chirchiq": ["Hamma", "O'rta Chirchiq-1"],
      "Yangiyo'l": ["Hamma", "Yangiyo'l-1"],
      "Yuqori Chirchiq": ["Hamma", "Yuqori Chirchiq-1"],
      "Zangiota": ["Hamma", "Zangiota-1"]
    }
  },
  "Samarqand": {
    districts: {
      "Bulung'ur": ["Hamma", "Bulung'ur-1"],
      "Ishtixon": ["Hamma", "Ishtixon-1"],
      "Jomboy": ["Hamma", "Jomboy-1"],
      "Kattaqo'rg'on": ["Hamma", "Kattaqo'rg'on-1"],
      "Narpay": ["Hamma", "Narpay-1"],
      "Nurobod": ["Hamma", "Nurobod-1"],
      "Oqdaryo": ["Hamma", "Oqdaryo-1"],
      "Payariq": ["Hamma", "Payariq-1"],
      "Pastdarg'om": ["Hamma", "Pastdarg'om-1"],
      "Samarqand": ["Hamma", "Samarqand-1"],
      "Toyloq": ["Hamma", "Toyloq-1"],
      "Urgut": ["Hamma", "Urgut-1"]
    }
  },
  "Buxoro": {
    districts: {
      "Buxoro": ["Hamma", "Buxoro-1"],
      "G'ijduvon": ["Hamma", "G'ijduvon-1"],
      "Jondor": ["Hamma", "Jondor-1"],
      "Kogon": ["Hamma", "Kogon-1"],
      "Olot": ["Hamma", "Olot-1"],
      "Peshku": ["Hamma", "Peshku-1"],
      "Romitan": ["Hamma", "Romitan-1"],
      "Shofirkon": ["Hamma", "Shofirkon-1"],
      "Vobkent": ["Hamma", "Vobkent-1"]
    }
  },
  "Qashqadaryo": {
    districts: {
      "Dehqonobod": ["Hamma", "Dehqonobod-1"],
      "Kasbi": ["Hamma", "Kasbi-1"],
      "Kitob": ["Hamma", "Kitob-1"],
      "Mirishkor": ["Hamma", "Mirishkor-1"],
      "Muborak": ["Hamma", "Muborak-1"],
      "Nishon": ["Hamma", "Nishon-1"],
      "Qamashi": ["Hamma", "Qamashi-1"],
      "Qarshi": ["Hamma", "Qarshi-1"],
      "Shahrisabz": ["Hamma", "Shahrisabz-1"],
      "Yakkabog'": ["Hamma", "Yakkabog'-1"]
    }
  },
  "Surxondaryo": {
    districts: {
      "Angor": ["Hamma", "Angor-1"],
      "Bandixon": ["Hamma", "Bandixon-1"],
      "Boysun": ["Hamma", "Boysun-1"],
      "Denov": ["Hamma", "Denov-1"],
      "Jarqo'rg'on": ["Hamma", "Jarqo'rg'on-1"],
      "Muzrabot": ["Hamma", "Muzrabot-1"],
      "Oltinsoy": ["Hamma", "Oltinsoy-1"],
      "Qiziriq": ["Hamma", "Qiziriq-1"],
      "Qumqo'rg'on": ["Hamma", "Qumqo'rg'on-1"],
      "Sariosiyo": ["Hamma", "Sariosiyo-1"],
      "Sherobod": ["Hamma", "Sherobod-1"],
      "Shorchi": ["Hamma", "Shorchi-1"],
      "Termiz": ["Hamma", "Termiz-1"],
      "Uzun": ["Hamma", "Uzun-1"]
    }
  },
  "Xorazm": {
    districts: {
      "Bog'ot": ["Hamma", "Bog'ot-1"],
      "Gurlan": ["Hamma", "Gurlan-1"],
      "Xiva": ["Hamma", "Xiva-1"],
      "Qo'shko'pir": ["Hamma", "Qo'shko'pir-1"],
      "Shovot": ["Hamma", "Shovot-1"],
      "Urganch": ["Hamma", "Urganch-1"],
      "Xazorasp": ["Hamma", "Xazorasp-1"],
      "Yangibozor": ["Hamma", "Yangibozor-1"],
      "Yangiariq": ["Hamma", "Yangiariq-1"]
    }
  },
  "Andijon": {
    districts: {
      "Andijon": ["Hamma", "Andijon-1"],
      "Asaka": ["Hamma", "Asaka-1"],
      "Baliqchi": ["Hamma", "Baliqchi-1"],
      "Bo'ston": ["Hamma", "Bo'ston-1"],
      "Buloqboshi": ["Hamma", "Buloqboshi-1"],
      "Izboskan": ["Hamma", "Izboskan-1"],
      "Jalaquduq": ["Hamma", "Jalaquduq-1"],
      "Xo'jaobod": ["Hamma", "Xo'jaobod-1"],
      "Qo'rg'ontepa": ["Hamma", "Qo'rg'ontepa-1"],
      "Marhamat": ["Hamma", "Marhamat-1"],
      "Oltinko'l": ["Hamma", "Oltinko'l-1"],
      "Paxtaobod": ["Hamma", "Paxtaobod-1"],
      "Shahrixon": ["Hamma", "Shahrixon-1"],
      "Ulug'nor": ["Hamma", "Ulug'nor-1"]
    }
  },
  "Namangan": {
    districts: {
      "Chortoq": ["Hamma", "Chortoq-1"],
      "Chust": ["Hamma", "Chust-1"],
      "Kosonsoy": ["Hamma", "Kosonsoy-1"],
      "Mingbuloq": ["Hamma", "Mingbuloq-1"],
      "Namangan": ["Hamma", "Namangan-1"],
      "Norin": ["Hamma", "Norin-1"],
      "Pop": ["Hamma", "Pop-1"],
      "To'raqo'rg'on": ["Hamma", "To'raqo'rg'on-1"],
      "Uychi": ["Hamma", "Uychi-1"],
      "Uchqo'rg'on": ["Hamma", "Uchqo'rg'on-1"],
      "Yangiqo'rg'on": ["Hamma", "Yangiqo'rg'on-1"]
    }
  },
  "Farg'ona": {
    districts: {
      "Bag'dod": ["Hamma", "Bag'dod-1"],
      "Beshariq": ["Hamma", "Beshariq-1"],
      "Buvayda": ["Hamma", "Buvayda-1"],
      "Dang'ara": ["Hamma", "Dang'ara-1"],
      "Farg'ona": ["Hamma", "Farg'ona-1"],
      "Furqat": ["Hamma", "Furqat-1"],
      "Oltiariq": ["Hamma", "Oltiariq-1"],
      "Qo'qon": ["Hamma", "Qo'qon-1"],
      "Quva": ["Hamma", "Quva-1"],
      "Rishton": ["Hamma", "Rishton-1"],
      "So'x": ["Hamma", "So'x-1"],
      "Toshloq": ["Hamma", "Toshloq-1"],
      "Uchko'prik": ["Hamma", "Uchko'prik-1"],
      "Yozyovon": ["Hamma", "Yozyovon-1"]
    }
  },
  "Sirdaryo": {
    districts: {
      "Boyovut": ["Hamma", "Boyovut-1"],
      "Guliston": ["Hamma", "Guliston-1"],
      "Mirzaobod": ["Hamma", "Mirzaobod-1"],
      "Oqoltin": ["Hamma", "Oqoltin-1"],
      "Sayxunobod": ["Hamma", "Sayxunobod-1"],
      "Sirdaryo": ["Hamma", "Sirdaryo-1"],
      "Xovos": ["Hamma", "Xovos-1"]
    }
  },
  "Jizzax": {
    districts: {
      "Arnasoy": ["Hamma", "Arnasoy-1"],
      "Baxmal": ["Hamma", "Baxmal-1"],
      "Do'stlik": ["Hamma", "Do'stlik-1"],
      "Forish": ["Hamma", "Forish-1"],
      "G'allaorol": ["Hamma", "G'allaorol-1"],
      "Jizzax": ["Hamma", "Jizzax-1"],
      "Mirzacho'l": ["Hamma", "Mirzacho'l-1"],
      "Paxtakor": ["Hamma", "Paxtakor-1"],
      "Yangiobod": ["Hamma", "Yangiobod-1"],
      "Zafarobod": ["Hamma", "Zafarobod-1"],
      "Zomin": ["Hamma", "Zomin-1"]
    }
  },
  "Navoiy": {
    districts: {
      "Karmana": ["Hamma", "Karmana-1"],
      "Konimex": ["Hamma", "Konimex-1"],
      "Navbahor": ["Hamma", "Navbahor-1"],
      "Nurota": ["Hamma", "Nurota-1"],
      "Qiziltepa": ["Hamma", "Qiziltepa-1"],
      "Tomdiy": ["Hamma", "Tomdiy-1"],
      "Uchquduq": ["Hamma", "Uchquduq-1"],
      "Xatirchi": ["Hamma", "Xatirchi-1"]
    }
  },
  "Qoraqalpog'iston": {
    districts: {
      "Amudaryo": ["Hamma", "Amudaryo-1"],
      "Beruniy": ["Hamma", "Beruniy-1"],
      "Chimboy": ["Hamma", "Chimboy-1"],
      "Ellikqala": ["Hamma", "Ellikqala-1"],
      "Kegeyli": ["Hamma", "Kegeyli-1"],
      "Mo'ynoq": ["Hamma", "Mo'ynoq-1"],
      "Nukus": ["Hamma", "Nukus-1"],
      "Qanliko'l": ["Hamma", "Qanliko'l-1"],
      "Qo'ng'irot": ["Hamma", "Qo'ng'irot-1"],
      "Qorao'zak": ["Hamma", "Qorao'zak-1"],
      "Shumanay": ["Hamma", "Shumanay-1"],
      "Taxtako'pir": ["Hamma", "Taxtako'pir-1"],
      "To'rtko'l": ["Hamma", "To'rtko'l-1"],
      "Xo'jayli": ["Hamma", "Xo'jayli-1"]
    }
  }
};

const regionNames = ["Hamma", ...Object.keys(regions)];
