// Converte os JSON do jogo em um módulo TypeScript para o servidor.
// O Node na Vercel não importa .json sem atributo de importação; um .ts compilado funciona.
import {readFileSync, writeFileSync} from 'node:fs';
const ler = f => JSON.stringify(JSON.parse(readFileSync(new URL('../docs/sombra-no-guaiba/' + f, import.meta.url), 'utf8')));
writeFileSync(new URL('../src/sombra/rules/dados.ts', import.meta.url),
  '// Gerado por scripts/sombra-dados.mjs a partir de docs/sombra-no-guaiba/*.json. Não edite à mão.\n' +
  `export const mapa = ${ler('mapa.json')};\nexport const cartas = ${ler('cartas.json')};\n`);
console.log('src/sombra/rules/dados.ts atualizado');
