import { getSunHours } from './services/solarData';

console.log("Beijing, Chaoyang:", getSunHours("Beijing", "朝阳区"));
console.log("Shanghai, Pudong:", getSunHours("Shanghai", "浦东新区"));
console.log("Xizang, Ali:", getSunHours("Xizang", "阿里地区"));
