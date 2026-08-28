#!/usr/bin/env node
/* Yayın derlemesi — dist/ klasörünü hazırlar.
 *
 *   node scripts/build.mjs           # hassas alanlar SİLİNİR (herkese açık yayın)
 *   node scripts/build.mjs --private # her şey dahil (özel/parola korumalı yayın)
 *
 * Neden önemli: tarayıcıdaki "koleksiyoner modu" düğmesi bir güvenlik önlemi
 * DEĞİLDİR — sadece görüntüyü sadeleştirir. Veriyi gerçekten gizlemenin tek
 * yolu, yayınlanan JSON'un içinde o alanların hiç bulunmamasıdır. Bu betik
 * site.config.json > privateFields listesindeki alanları dist/ kopyasından
 * temizler; depodaki asıl dosyalara dokunmaz. */

import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const OUT = 'dist';
const isPrivateBuild = process.argv.includes('--private');

const COPY = ['index.html', 'assets', 'photos', 'data', 'site.config.json'];

function stripPath(obj, path) {
  const keys = path.split('.');
  let node = obj;
  for (const key of keys.slice(0, -1)) {
    if (node == null || typeof node !== 'object') return;
    node = node[key];
  }
  if (node && typeof node === 'object') delete node[keys.at(-1)];
}

async function main() {
  const config = JSON.parse(await readFile('site.config.json', 'utf8'));
  const privateFields = config.privateFields || [];

  await rm(OUT, { recursive: true, force: true });
  await mkdir(OUT, { recursive: true });

  for (const entry of COPY) {
    try {
      await cp(entry, join(OUT, entry), { recursive: true });
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
  }

  if (!isPrivateBuild && privateFields.length) {
    const watches = JSON.parse(await readFile('data/watches.json', 'utf8'));
    for (const watch of watches) {
      for (const path of privateFields) stripPath(watch, path);
      // Boş kalan kapsayıcıları da temizle.
      if (watch.acquisition && Object.keys(watch.acquisition).length === 0) delete watch.acquisition;
    }
    const target = join(OUT, 'data/watches.json');
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, JSON.stringify(watches, null, 2) + '\n');

    // Siteye açıkça söyle: bu derlemede alanlar silindi. Böylece arayüz
    // "silinmiş" ile "hiç girilmemiş" arasındaki farkı tahmin etmek zorunda
    // kalmaz — ikisi veride birebir aynı görünür.
    await writeFile(join(OUT, 'site.config.json'),
      JSON.stringify({ ...config, strippedBuild: true }, null, 2) + '\n');

    console.log(`  Gizlenen alanlar dist/ kopyasından silindi: ${privateFields.join(', ')}`);
  } else if (isPrivateBuild) {
    console.log('  --private: hassas alanlar dahil edildi. Bu derlemeyi herkese AÇIK yayınlama.');
  }

  await writeFile(join(OUT, '.nojekyll'), '');
  console.log(`  ✓ ${OUT}/ hazır.`);
}

main().catch((err) => { console.error(err); process.exit(1); });
