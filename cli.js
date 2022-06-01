#!/usr/bin/env node
// vim: ts=2 sw=2 et ai
/*
  Menhera Packages
  Copyright (C) 2022 真空 et al.

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

const fs = require('fs/promises');
const crypto = require('crypto');
const path = require('path');

const template_path = process.argv[2];
if (!template_path) {
  throw new Error('Empty path');
}

fs.readFile(template_path, {
  encoding: 'utf-8',
}).then(async (str) => {
  const template = JSON.parse(str);
  if (!template["mpkg-template"]) {
    throw new Error('Not a package template');
  }
  if (template["mpkg-template"] != 1) {
    throw new Error("Unsupported package template version");
  }
  if ('string' != typeof template.id || !template.id) {
    throw new Error("Invalid ID");
  }
  const id = template.id;
  const types = {
    js: "text/javascript",
    mjs: "text/javascript",
    png: "image/png",
    webp: "image/webp",
    svg: "image/svg+xml",
    html: "text/html",
    xhtml: "application/xhtml+xml",
    xml: "application/xml",
    json: "application/json",
  };
  if ('object' == typeof template.types && template.types) {
    for (const key of Reflect.ownKeys(template.types)) {
      types[key] = String(template.types[key]);
    }
  }
  const blobs = {};
  if ('object' != typeof template.files || !template.files) {
    throw new Error("Invalid files dictionary");
  }
  const index = {};
  index["mpkg-index"] = 1;
  index.id = id;
  index.blobs = {};
  for (const key of Reflect.ownKeys(template.files)) {
    const blob_path = path.join(path.dirname(template_path), template.files[key]);
    if ('string' != typeof blob_path || !blob_path) {
      throw new Error('Invalid path');
    }
    const buffer = await fs.readFile(blob_path);
    const hash = crypto.createHash('sha256');
    hash.update(buffer);
    const digest = hash.digest('hex').toLowerCase();
    const extension = blob_path.split('.').slice(-1)[0].toLowerCase();
    let type;
    if (extension in types) {
      type = types[extension];
    } else {
      type = 'text/html';
    }
    const blob = {};
    blob.type = type;
    blob.sha256 = digest;
    blob.source = digest;
    await fs.writeFile(digest, buffer);
    console.log('blob: ', digest);
    index.blobs[key] = blob;
  }
  const json = JSON.stringify(index);
  const json_buffer = Buffer.from(json, 'utf-8');
  const json_hash = crypto.createHash('sha256');
  json_hash.update(json_buffer);
  const json_digest = json_hash.digest('hex').toLowerCase();
  const index_path = `./${json_digest}.json`;
  await fs.writeFile(index_path, json_buffer);
  console.log('written: ', index_path);
});
