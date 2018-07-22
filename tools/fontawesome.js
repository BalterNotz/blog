#!/usr/bin/env node

const fontawesome = require('@fortawesome/fontawesome-svg-core');
const brands      = require('@fortawesome/free-brands-svg-icons').fab;
const solid       = require('@fortawesome/free-solid-svg-icons').fas;

// initialize font awesome
fontawesome.library.add(brands);
fontawesome.library.add(solid);

const argv = process.argv.slice(2);
if (argv.length == 0) {
  process.exit(1);
}

switch (argv[0]) {
  case 'css':
    console.log(fontawesome.dom.css());
    break;

  case 'list':
    let o = {};
    for (prefix in fontawesome.library.definitions) {
      o[prefix] = {};
      for (name in fontawesome.library.definitions[prefix]) {
        o[prefix][name] = fontawesome.icon({prefix: prefix, iconName: name}).abstract[0];
      }
    }
    console.log(JSON.stringify(o));
    break;

  default:
    process.exit(1);
}
