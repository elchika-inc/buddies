#!/usr/bin/env node

// PawMatch サンプル画像アップロードスクリプト
// ローカルR2バケットにサンプル画像をアップロードします

import { spawn } from 'child_process';
import { mkdir, rm } from 'fs/promises';
import { createWriteStream } from 'fs';
import https from 'https';
import { join } from 'path';
// 画像URL配列を直接定義
const catImageUrls = [
  'https://images.unsplash.com/photo-1513360371669-4adf3dd7dff8?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1495360010541-f48722b34f7d?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1501820488136-72669149e0d4?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1478098711619-5ab0b478d6e6?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1526336024174-e58f5cdd8e13?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1548802673-380ab8ebc7b7?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1569591159212-b02ea8a9f239?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1606214174585-fe31582dc6ee?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1548681528-6a5c45b66b42?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472491235688-bdc81a63246e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1519052537078-e6302a4968d4?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1506891536236-3e07892564b7?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1520315342629-6ea920342047?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518791841217-8f162f1e1131?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1515002246390-7bf7e8f87b54?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1529778873920-4da4926a72c2?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1543852786-1cf6624b9987?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1559235038-1b47ad64462e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1574144611937-0df059b5ef3e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1571566882372-1598d88abd90?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1615789591457-74a63395c990?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1561948955-570b270e7c36?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1571988840298-3b5301d5109b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1582725602967-ca77857420d9?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579168765467-3b235f938439?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1606868306217-dbf5046868d2?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1574231164645-d6f0e8553590?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1546146830-2cca2636515b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1581795669633-91ef7c9dcf39?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1589883661923-6476cb0ae9f2?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1548247416-ec66f4900b2e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570458468633-75daa4d1ee70?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560114928-40f1f1eb26a0?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1587726283506-e4d536b52f9d?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1554980291-c962b0483e27?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1568572933382-74d440642117?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1594736797933-d0400281ca57?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1571566882372-1598d88abd90?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1591871937573-74dbba515c4c?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544525977-0c3d14130a8b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1557246865-a9966f67d89b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1555201071-7c2e3ff9b6cb?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1595433707802-6b2626ef1c91?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1596854407944-bf87f6fdd49e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1573865526739-10659fec78a5?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1610016302532-c9a5c3f65e7f?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1574231164645-d6f0e8553590?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1571566882372-1598d88abd90?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1592194996308-7b43878e84a6?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1581795669633-91ef7c9dcf39?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570458468633-75daa4d1ee70?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1554980291-c962b0483e27?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579168765467-3b235f938439?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1568572933382-74d440642117?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1535930891776-0c2dfb7fda1a?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1560114928-40f1f1eb26a0?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1557246865-a9966f67d89b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1594736797933-d0400281ca57?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1587726283506-e4d536b52f9d?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1591871937573-74dbba515c4c?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1555201071-7c2e3ff9b6cb?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1589883661923-6476cb0ae9f2?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1548247416-ec66f4900b2e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1610016302532-c9a5c3f65e7f?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1544525977-0c3d14130a8b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1620001796685-adf7110fe1b8?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1615789591457-74a63395c990?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1606868306217-dbf5046868d2?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1561948955-570b270e7c36?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1571988840298-3b5301d5109b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1582725602967-ca77857420d9?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1546146830-2cca2636515b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1622008808512-fdd9aa0c2ac0?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1619969120294-ce9c5de6c6c3?w=400&h=400&fit=crop&q=80'
];

const dogImageUrls = [
  'https://images.unsplash.com/photo-1477884213360-7e9d7dcc1e48?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1529429617124-95b109e86bb8?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1537151625747-768eb6cf92b3?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1520087619250-584c0cbd35e8?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534361960057-19889db9621e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1562813733-b31f71025d54?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1546975490-e8b92a360b24?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1574293876203-46d0d32a8183?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583511655826-05700d52f4d9?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1551717743-49959800b1f6?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1564149504571-a9d8e527ab3b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1598133894008-61f7fdb8cc3a?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1586671267731-da2cf3ceeb80?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570018144715-43110363d70a?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1553736026-bd0df043ed23?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1581929981395-a9adefcfcf30?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1591769225440-811ad7d6eab3?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1576771232600-5c9ffaeac45f?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1588269845464-e5cd75c834be?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1553882809-a4f325ab5d5e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600298881974-6be191ceeda1?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1571988840298-3b5301d5109b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1546975490-e8b92a360b24?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1558929996-da64ba858215?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583337130417-3346a1be7dee?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1598300042247-d088f8ab3a91?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1601758125946-6ec2ef64daf8?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1567529692333-de9fd6de3fdc?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1565011523534-747a8601f10a?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1589933767411-b156d9197c3b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1598134493650-3a4f40c20b2b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1570018144715-43110363d70a?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1554731353-5d0f9c1a9ae2?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1576771232600-5c9ffaeac45f?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1591769225440-811ad7d6eab3?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1574293876203-46d0d32a8183?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583511655826-05700d52f4d9?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1598133894008-61f7fdb8cc3a?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1586671267731-da2cf3ceeb80?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1558929996-da64ba858215?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1553882809-a4f325ab5d5e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1600298881974-6be191ceeda1?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1567529692333-de9fd6de3fdc?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1565011523534-747a8601f10a?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1589933767411-b156d9197c3b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1598134493650-3a4f40c20b2b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1554731353-5d0f9c1a9ae2?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1588269845464-e5cd75c834be?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1559827260-dc66d52bef19?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1553736026-bd0df043ed23?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1581929981395-a9adefcfcf30?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1564149504571-a9d8e527ab3b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1590736969955-71cc94901144?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1562813733-b31f71025d54?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1534361960057-19889db9621e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1520087619250-584c0cbd35e8?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1601758228041-f3b2795255f1?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1546975490-e8b92a360b24?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517423440428-a5a00ad493e8?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1605736875025-4c9cd07e8fb7?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583512603805-3cc6b41f3edb?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1571566882372-1598d88abd90?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1593134257782-e89567b7718a?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1574293876203-46d0d32a8183?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1561037404-61cd46aa615b?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517849845537-4d257902454a?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1529429617124-95b109e86bb8?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1558788353-f76d92427f16?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1537151625747-768eb6cf92b3?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1562813733-b31f71025d54?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1599596914253-9e4ac4b26a71?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1552053831-71594a27632d?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1586671267731-da2cf3ceeb80?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1620001796685-adf7110fe1b8?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1615789591457-74a63395c990?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1618826411640-d6df44dd3f7a?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1606868306217-dbf5046868d2?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1622008808512-fdd9aa0c2ac0?w=400&h=400&fit=crop&q=80',
  'https://images.unsplash.com/photo-1619969120294-ce9c5de6c6c3?w=400&h=400&fit=crop&q=80'
];

const TEMP_DIR = '/tmp/pawmatch-images';
const API_DIR = '/Users/nishikawa/projects/elchika/pawmatch/api';

console.log('🐱🐶 PawMatch サンプル画像アップロード開始');

async function downloadImage(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

async function uploadToR2(localPath, r2Path) {
  return new Promise((resolve, reject) => {
    const child = spawn('wrangler', ['r2', 'object', 'put', r2Path, '--file', localPath, '--local'], {
      cwd: API_DIR,
      stdio: 'pipe'
    });

    child.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`wrangler exit code ${code}`));
      }
    });

    child.on('error', reject);
  });
}

async function main() {
  try {
    // 一時ディレクトリ作成
    await mkdir(join(TEMP_DIR, 'cats'), { recursive: true });
    await mkdir(join(TEMP_DIR, 'dogs'), { recursive: true });

    // 猫画像の処理
    console.log(`📸 猫の画像を${catImageUrls.length}件ダウンロード中...`);
    for (let i = 0; i < catImageUrls.length; i++) {
      const catNum = String(i + 1).padStart(3, '0');
      const filename = `cat-${catNum}.jpg`;
      const localPath = join(TEMP_DIR, 'cats', filename);
      const r2Path = `pawmatch-images/cats/${filename}`;

      try {
        console.log(`  📥 ${filename} をダウンロード中... (${i + 1}/${catImageUrls.length})`);
        await downloadImage(catImageUrls[i], localPath);
        
        console.log(`  📤 ${filename} をR2にアップロード中...`);
        await uploadToR2(localPath, r2Path);
      } catch (error) {
        console.error(`❌ ${filename} の処理でエラー:`, error.message);
      }
    }

    // 犬画像の処理
    console.log(`📸 犬の画像を${dogImageUrls.length}件ダウンロード中...`);
    for (let i = 0; i < dogImageUrls.length; i++) {
      const dogNum = String(i + 1).padStart(3, '0');
      const filename = `dog-${dogNum}.jpg`;
      const localPath = join(TEMP_DIR, 'dogs', filename);
      const r2Path = `pawmatch-images/dogs/${filename}`;

      try {
        console.log(`  📥 ${filename} をダウンロード中... (${i + 1}/${dogImageUrls.length})`);
        await downloadImage(dogImageUrls[i], localPath);
        
        console.log(`  📤 ${filename} をR2にアップロード中...`);
        await uploadToR2(localPath, r2Path);
      } catch (error) {
        console.error(`❌ ${filename} の処理でエラー:`, error.message);
      }
    }

    // 一時ファイルクリーンアップ
    console.log('🧹 一時ファイルを削除中...');
    await rm(TEMP_DIR, { recursive: true, force: true });

    console.log('✅ アップロード完了！');
    console.log('📊 アップロード結果:');
    console.log(`  🐱 猫画像: ${catImageUrls.length}件`);
    console.log(`  🐶 犬画像: ${dogImageUrls.length}件`);
    console.log('');
    console.log('🔗 テストURL:');
    console.log('  http://localhost:8787/images/cats/cat-001.jpg');
    console.log('  http://localhost:8787/images/dogs/dog-001.jpg');

  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

main();