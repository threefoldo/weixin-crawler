'use strict';

const Wxr = require('wxr');
const $ = require('cheerio');
const path = require('path');
const fs = require('fs');
const imgUrlFix = 'http://read.html5.qq.com/image?src=forum&q=5&r=0&imgflag=7&imageUrl=';
const outputDir = path.join(__dirname, 'out');

const importer = new Wxr();
const files = [];
fs.readdirSync(outputDir).forEach((name) => {
  if (!name.endsWith('.html')) {
    return;
  }
  files.push(name);
  const raw = fs.readFileSync(path.join(outputDir, name), 'utf-8');
  const article = parseArticle(raw);
  try {
    importer.addPost({
      title: name.slice(0, -5),
      date: article.date,
      contentEncoded: article.content,
    });
  } catch (ex) {
    ex.articleTitle = name.slice(0, -5);
    console.error(ex);
  }
});

function parseArticle(raw) {
  let obj = {};
  let contentNode = $(raw).find('#js_content');

  let postDate = $(raw).find('#post-date').text();
  obj.date = postDate || '';

  let imgs = [];
  let imgNodes = contentNode.find('img');
  for (let i = 0; i < imgNodes.length; i++) {
    let img = imgNodes[i];
    imgs.push(img.data['src']);
  }

  let contentStr = contentNode.html();
  for (let img of imgs) {
    let search = `data-src="${img}"`;
    let replace = `src="${imgUrlFix + img}"`;
    contentStr = contentStr.replace(search, replace);
  }
  obj.content = contentStr;
  return obj;
}

fs.writeFileSync(path.join(__dirname, 'result.xml'), importer.stringify(), 'utf-8');
console.log(`${files.length} files done.`);
