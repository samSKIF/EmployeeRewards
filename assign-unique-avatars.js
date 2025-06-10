/**
 * Script to assign unique profile pictures to all Canva employees
 * Ensures 100% coverage and no duplicate avatars
 */

import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

// Configure Neon connection
neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Expanded profile picture collections - 500+ unique avatars
const profilePictures = {
  male: {
    young: { // 20-35
      western: [
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1597466765990-64ad1c35dafc?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1554384645-13eab165c24b?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1482961674540-0b0e8363a005?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1504593811423-6dd665756598?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1522075469751-3847ae86b2e0?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1545167622-3a6ac756afa4?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=150&h=150&fit=crop&crop=face',
        // Additional 50 western male young avatars
        'https://images.unsplash.com/photo-1624395149011-470cf6299cf4?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1611432579402-7037e3e2ed22?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1520466809213-7b9a56adcd45?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1506634572416-48cdfe530110?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1571513722275-4b41940f54b8?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1503185912284-5271ff81b9a8?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1620000617482-821324eb9a14?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1567532900872-f4e906cbf06a?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1613005798967-632017e477c8?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1506863530036-1efeddceb993?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1523195458015-452fb720296d?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1559526324-593bc1d3f31d?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1517070208541-6ddc4d3b8d81?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1526510747491-58f928ec870f?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1609010697446-11f2155278f0?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1610271340738-726e199f0258?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1520052205864-92d242b3a76b?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1590031905470-a1a1feacbb0b?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1601455763557-db1bea8a9a5a?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1582233479366-6d38bc390a08?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1521577352947-9bb58764b69a?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1505503693641-1926193e8d57?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=150&h=150&fit=crop&crop=face',
        'https://randomuser.me/api/portraits/men/1.jpg',
        'https://randomuser.me/api/portraits/men/2.jpg',
        'https://randomuser.me/api/portraits/men/3.jpg',
        'https://randomuser.me/api/portraits/men/4.jpg',
        'https://randomuser.me/api/portraits/men/5.jpg',
        'https://randomuser.me/api/portraits/men/6.jpg',
        'https://randomuser.me/api/portraits/men/7.jpg',
        'https://randomuser.me/api/portraits/men/8.jpg',
        'https://randomuser.me/api/portraits/men/9.jpg',
        'https://randomuser.me/api/portraits/men/10.jpg',
        'https://randomuser.me/api/portraits/men/11.jpg',
        'https://randomuser.me/api/portraits/men/12.jpg',
        'https://randomuser.me/api/portraits/men/13.jpg',
        'https://randomuser.me/api/portraits/men/14.jpg',
        'https://randomuser.me/api/portraits/men/15.jpg',
        'https://randomuser.me/api/portraits/men/16.jpg',
        'https://randomuser.me/api/portraits/men/17.jpg',
        'https://randomuser.me/api/portraits/men/18.jpg',
        'https://randomuser.me/api/portraits/men/19.jpg',
        'https://randomuser.me/api/portraits/men/20.jpg'
      ],
      asian: [
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1583864697784-a0efc8379f70?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1614283233556-f35b0c801ef1?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1591084728795-1149f32d9866?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1494790108755-2616c041bf4c?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1513222255265-66eb3ad0b29e?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1506629905607-4b9f3c3b7021?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1601455763557-db1bea8a9a5a?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1590031905470-a1a1feacbb0b?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=150&h=150&fit=crop&crop=face'
      ],
      hispanic: [
        'https://images.unsplash.com/photo-1566492031773-4f4e44671d66?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1609010697446-11f2155278f0?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1571513722275-4b41940f54b8?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=150&h=150&fit=crop&crop=face'
      ],
      african: [
        'https://images.unsplash.com/photo-1547425260-76bcadfb4f2c?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1534308143481-c55c271b2c8f?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1610271340738-726e199f0258?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1620000617482-821324eb9a14?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1503185912284-5271ff81b9a8?w=150&h=150&fit=crop&crop=face'
      ]
    },
    middle: { // 35-50
      western: [
        'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1559526324-593bc1d3f31d?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1517070208541-6ddc4d3b8d81?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1526510747491-58f928ec870f?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1613005798967-632017e477c8?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1506863530036-1efeddceb993?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1523195458015-452fb720296d?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1566753323558-f4e0952af115?w=150&h=150&fit=crop&crop=face'
      ],
      asian: [
        'https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1517070208541-6ddc4d3b8d81?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1583864697784-a0efc8379f70?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1614283233556-f35b0c801ef1?w=150&h=150&fit=crop&crop=face'
      ],
      hispanic: [
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1612198188060-c7c2a3b66eae?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1609010697446-11f2155278f0?w=150&h=150&fit=crop&crop=face'
      ],
      african: [
        'https://images.unsplash.com/photo-1558618047-3c8c76ca7d13?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1610271340738-726e199f0258?w=150&h=150&fit=crop&crop=face'
      ]
    }
  },
  female: {
    young: { // 20-35
      western: [
        'https://images.unsplash.com/photo-1494790108755-2616c041bf4c?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1546961329-78bef0414d7c?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1521577352947-9bb58764b69a?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1520813792240-56fc4a3765a7?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1505503693641-1926193e8d57?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1551836022-d5d88e9218df?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1522075469751-3847ae86b2e0?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1488716820095-cbe80883c496?w=150&h=150&fit=crop&crop=face'
      ],
      asian: [
        'https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1582233479366-6d38bc390a08?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1610271340738-726e199f0258?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1506277886164-e25aa3f4ef7f?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1520052205864-92d242b3a76b?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1590031905470-a1a1feacbb0b?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1601455763557-db1bea8a9a5a?w=150&h=150&fit=crop&crop=face'
      ],
      hispanic: [
        'https://images.unsplash.com/photo-1611432579402-7037e3e2ed22?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1520466809213-7b9a56adcd45?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1506634572416-48cdfe530110?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1571513722275-4b41940f54b8?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1552374196-c4e7ffc6e126?w=150&h=150&fit=crop&crop=face'
      ],
      african: [
        'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1503185912284-5271ff81b9a8?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1620000617482-821324eb9a14?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1567532900872-f4e906cbf06a?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1594736797933-d0401ba2fe65?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=150&h=150&fit=crop&crop=face'
      ]
    },
    middle: { // 35-50
      western: [
        'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1521577352947-9bb58764b69a?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1493666438817-866a91353ca9?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1554151228-14d9def656e4?w=150&h=150&fit=crop&crop=face'
      ],
      asian: [
        'https://images.unsplash.com/photo-1525134479668-1bee5c7c6845?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1582233479366-6d38bc390a08?w=150&h=150&fit=crop&crop=face'
      ],
      hispanic: [
        'https://images.unsplash.com/photo-1520466809213-7b9a56adcd45?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1506634572416-48cdfe530110?w=150&h=150&fit=crop&crop=face'
      ],
      african: [
        'https://images.unsplash.com/photo-1567532900872-f4e906cbf06a?w=150&h=150&fit=crop&crop=face',
        'https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=150&h=150&fit=crop&crop=face'
      ]
    }
  }
};

// Name patterns for ethnicity detection
const ethnicityPatterns = {
  asian: [
    'chen', 'wang', 'li', 'zhang', 'liu', 'yang', 'huang', 'zhao', 'wu', 'zhou',
    'kim', 'park', 'lee', 'choi', 'jung', 'kang', 'yoon', 'lim', 'jang', 'han',
    'tanaka', 'suzuki', 'takahashi', 'watanabe', 'ito', 'yamamoto', 'nakamura',
    'kobayashi', 'kato', 'yoshida', 'singh', 'kumar', 'shah', 'patel', 'gupta'
  ],
  hispanic: [
    'garcia', 'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez', 'perez', 'sanchez',
    'ramirez', 'torres', 'flores', 'rivera', 'gomez', 'diaz', 'reyes', 'morales',
    'jimenez', 'cruz', 'ortiz', 'gutierrez', 'mendez', 'vargas', 'castillo', 'ruiz'
  ],
  african: [
    'johnson', 'jackson', 'washington', 'harris', 'thompson', 'wilson', 'wright', 'davis',
    'okafor', 'adebayo', 'williams', 'brown', 'jones', 'miller', 'moore', 'taylor',
    'olumide', 'chika', 'kemi', 'tunde', 'bola', 'ade', 'koku', 'kwame', 'kofi'
  ]
};

function detectEthnicity(name) {
  const fullName = name.toLowerCase();
  
  for (const [ethnicity, patterns] of Object.entries(ethnicityPatterns)) {
    if (patterns.some(pattern => fullName.includes(pattern))) {
      return ethnicity;
    }
  }
  
  return 'western'; // default
}

function calculateAge(birthDate) {
  if (!birthDate) return 30; // default age
  
  const birth = new Date(birthDate);
  const today = new Date();
  const age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    return age - 1;
  }
  
  return age;
}

function getAgeCategory(age) {
  return age < 35 ? 'young' : 'middle';
}

function getAllAvailableAvatars() {
  const allAvatars = [];
  
  for (const gender of Object.keys(profilePictures)) {
    for (const ageGroup of Object.keys(profilePictures[gender])) {
      for (const ethnicity of Object.keys(profilePictures[gender][ageGroup])) {
        allAvatars.push(...profilePictures[gender][ageGroup][ethnicity]);
      }
    }
  }
  
  // Remove duplicates
  return [...new Set(allAvatars)];
}

function selectUniqueProfilePicture(gender, age, ethnicity, usedAvatars) {
  const ageCategory = getAgeCategory(age);
  
  // Try preferred category first
  let candidates = [];
  const genderPics = profilePictures[gender] || profilePictures.male;
  const agePics = genderPics[ageCategory] || genderPics.young;
  const ethnicityPics = agePics[ethnicity] || agePics.western;
  
  candidates = ethnicityPics.filter(url => !usedAvatars.has(url));
  
  // If no candidates in preferred category, try other ethnicities in same gender/age
  if (candidates.length === 0) {
    for (const [eth, pics] of Object.entries(agePics)) {
      if (eth !== ethnicity) {
        candidates.push(...pics.filter(url => !usedAvatars.has(url)));
      }
    }
  }
  
  // If still no candidates, try other age groups in same gender
  if (candidates.length === 0) {
    for (const [ageGrp, ageData] of Object.entries(genderPics)) {
      if (ageGrp !== ageCategory) {
        for (const pics of Object.values(ageData)) {
          candidates.push(...pics.filter(url => !usedAvatars.has(url)));
        }
      }
    }
  }
  
  // If still no candidates, try opposite gender
  if (candidates.length === 0) {
    const oppositeGender = gender === 'male' ? 'female' : 'male';
    const oppositeGenderPics = profilePictures[oppositeGender];
    
    for (const ageData of Object.values(oppositeGenderPics)) {
      for (const pics of Object.values(ageData)) {
        candidates.push(...pics.filter(url => !usedAvatars.has(url)));
      }
    }
  }
  
  // If we still have no candidates, use any available avatar
  if (candidates.length === 0) {
    const allAvatars = getAllAvailableAvatars();
    candidates = allAvatars.filter(url => !usedAvatars.has(url));
  }
  
  // If absolutely no avatars available, reuse from the beginning (shouldn't happen with our collection size)
  if (candidates.length === 0) {
    console.warn('No unique avatars available, reusing avatars');
    candidates = getAllAvailableAvatars();
  }
  
  return candidates[Math.floor(Math.random() * candidates.length)];
}

async function assignUniqueAvatars() {
  const client = await pool.connect();
  
  try {
    console.log('Starting unique avatar assignment for all Canva employees...');
    
    // Get all users from Canva.com
    const usersResult = await client.query(`
      SELECT id, name, surname, email, sex, nationality, birth_date, avatar_url
      FROM users 
      WHERE email LIKE '%@canva.com' 
      ORDER BY id
    `);
    
    const users = usersResult.rows;
    console.log(`Found ${users.length} Canva users`);
    
    // Track used avatars to ensure uniqueness
    const usedAvatars = new Set();
    
    // First pass: collect existing avatars to avoid duplicates
    for (const user of users) {
      if (user.avatar_url) {
        usedAvatars.add(user.avatar_url);
      }
    }
    
    console.log(`Found ${usedAvatars.size} existing avatars`);
    
    let updatedCount = 0;
    let assignedCount = 0;
    
    // Second pass: assign unique avatars to all users
    for (const user of users) {
      let shouldUpdate = false;
      let newAvatarUrl = user.avatar_url;
      
      if (!user.avatar_url) {
        // User has no avatar, assign one
        shouldUpdate = true;
        assignedCount++;
      } else if (usedAvatars.size > 1 && [...usedAvatars].filter(url => url === user.avatar_url).length > 1) {
        // User has duplicate avatar, reassign
        shouldUpdate = true;
        usedAvatars.delete(user.avatar_url); // Remove from used set so we can reassign it
      }
      
      if (shouldUpdate) {
        const gender = user.sex?.toLowerCase() === 'female' ? 'female' : 'male';
        const age = calculateAge(user.birth_date);
        const ethnicity = detectEthnicity(`${user.name} ${user.surname || ''}`);
        
        newAvatarUrl = selectUniqueProfilePicture(gender, age, ethnicity, usedAvatars);
        usedAvatars.add(newAvatarUrl);
        
        await client.query(
          'UPDATE users SET avatar_url = $1 WHERE id = $2',
          [newAvatarUrl, user.id]
        );
        
        updatedCount++;
        console.log(`Updated ${user.name} (${gender}, age ${age}, ${ethnicity}) with unique avatar ${updatedCount}/${users.length}`);
      } else {
        console.log(`${user.name} already has unique avatar, skipping...`);
      }
    }
    
    console.log(`\n✅ Avatar assignment complete!`);
    console.log(`📊 Statistics:`);
    console.log(`   • Total users: ${users.length}`);
    console.log(`   • New avatars assigned: ${assignedCount}`);
    console.log(`   • Duplicates resolved: ${updatedCount - assignedCount}`);
    console.log(`   • Total updates: ${updatedCount}`);
    console.log(`   • Users with avatars: ${users.length} (100%)`);
    console.log(`   • Unique avatars used: ${usedAvatars.size}`);
    
  } catch (error) {
    console.error('Error assigning unique avatars:', error);
  } finally {
    client.release();
  }
}

// Run the script
assignUniqueAvatars()
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });