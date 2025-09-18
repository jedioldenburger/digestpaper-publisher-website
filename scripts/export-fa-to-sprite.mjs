import fs from 'node:fs';
import path from 'node:path';

// Kies de FA pakketten die jij gebruikt:
import { 
  faBuilding, faPhone, faEnvelope, faShieldHalved, faGavel, faScaleBalanced,
  faMagnifyingGlass, faRotateLeft, faCoins, faUserShield, faCookieBite,
  faFileContract, faUniversalAccess, faLock, faHandshakeAngle, faAward,
  faListCheck, faFolderTree
} from '@fortawesome/free-solid-svg-icons';

import { faGithub, faLinkedin, faInstagram } from '@fortawesome/free-brands-svg-icons';

const solids = [
  ['icon-building', faBuilding, 'Adres', 'Bedrijfsadres'],
  ['icon-phone', faPhone, 'Telefoon', 'Neem telefonisch contact op'],
  ['icon-envelope', faEnvelope, 'E-mail', 'Neem contact op via e-mail'],
  ['icon-shield-halved', faShieldHalved, 'Security', 'Beveiligingsbeleid'],
  ['icon-gavel', faGavel, 'Juridisch', 'Juridische informatie'],
  ['icon-scale-balanced', faScaleBalanced, 'Principes', 'Redactionele principes'],
  ['icon-magnifying-glass', faMagnifyingGlass, 'Fact-check', 'Controle van feiten en correcties'],
  ['icon-rotate-left', faRotateLeft, 'Correcties', 'Procedure voor correcties'],
  ['icon-coins', faCoins, 'Financiering', 'Financieringsbronnen'],
  ['icon-user-shield', faUserShield, 'Privacy', 'Privacyverklaring'],
  ['icon-cookie-bite', faCookieBite, 'Cookies', 'Cookiebeleid'],
  ['icon-file-contract', faFileContract, 'Voorwaarden', 'Gebruiksvoorwaarden'],
  ['icon-universal-access', faUniversalAccess, 'Toegankelijkheid', 'Toegankelijkheidsverklaring'],
  ['icon-lock', faLock, 'Security', 'Informatiebeveiliging'],
  ['icon-handshake-angle', faHandshakeAngle, 'Erkenningen', 'Dankbetuigingen aan bijdragers'],
  ['icon-award', faAward, 'Award', 'Onderscheidingen en erkenning'],
  ['icon-list-check', faListCheck, 'Overzicht', 'Checklist of overzichtspagina'],
  ['icon-folder-tree', faFolderTree, 'Dossiers', 'Overzicht van dossiers en rubrieken'],
];

const brands = [
  ['icon-github', faGithub, 'GitHub', 'Bezoek onze GitHub-organisatie'],
  ['icon-linkedin', faLinkedin, 'LinkedIn', 'Volg ons op LinkedIn'],
  ['icon-instagram', faInstagram, 'Instagram', 'Volg ons op Instagram'],
];

function symbolFromFA([id, fa, title, desc]) {
  const vbw = fa.icon[0], vbh = fa.icon[1];
  const pathData = Array.isArray(fa.icon[4]) ? fa.icon[4].join(' ') : fa.icon[4];
  return `
  <symbol id="${id}" viewBox="0 0 ${vbw} ${vbh}" role="img" aria-label="${title}">
    <title>${title}</title>
    <desc>${desc}</desc>
    <path fill="url(#icon-gradient)" d="${pathData}"/>
  </symbol>`;
}

const spritePath = path.resolve('public/svg/icons.svg'); // pas aan naar jouw pad
let sprite = fs.readFileSync(spritePath, 'utf8');

// Vervang placeholders (lege path met opacity="0") door echte FA-paths op basis van id
[...solids, ...brands].forEach(entry => {
  const [id] = entry;
  const sym = symbolFromFA(entry).trim();
  const regex = new RegExp(
    `<symbol id="${id}"[\\s\\S]*?<\\/symbol>`,
    'm'
  );
  sprite = sprite.replace(regex, sym);
});

fs.writeFileSync(spritePath, sprite, 'utf8');
console.log('icons.svg bijgewerkt met Font Awesome paden ✔︎');
