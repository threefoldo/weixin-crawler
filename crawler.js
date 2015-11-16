'use strict';

const request = require('urllib-sync').request;
const sleep = require('sleep').sleep;
const xmldoc = require('xmldoc');
const path = require('path');
const fs = require('fs');

const outputDir = path.join(__dirname, 'out');
const apiRoot = 'http://weixin.sogou.com';
const openId = 'oIWsFt3dWfYvPlfc8ZBBzjvffl8Q';
const ext = 'h3pzFjLZCZ0Y0nmoc3y7fQ8SxOv38L2PAEXyLuthQkRPIOQWPZOnzRgITve0Ud48';
const userAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2490.86 Safari/537.36';
const mockHeaders = {
  'Cookie': 'ABTEST=7|1447681194|v1; SUID=054B782A260C930A000000005649DCAA; SUID=054B782A3108990A000000005649DCAA; SUV=001610022A784B055649DCAAC2ABA204; weixinIndexVisited=1; sct=1; SNUID=E9A794C1ECE9CF43674D9F7EEC97EC4D; IPLOC=CN3100; wapsogou_qq_nickname=',
  'Host': 'weixin.sogou.com',
  'User-Agent': userAgent,
};
let skipPage = 0;
let totalPage = 10;

function onerror(err) {
  console.log(err);
  console.log(err.stack);
  process.exit(1);
}

function ensureResult(body) {
  if (body.indexOf('您的访问出错了') >= 0) {
    let err = new Error('Reached list request limit.');
    err.name = 'RequestListLimited';
    err.url = url;
    err.originBody = body;
    return onerror(err);
  }
}

// 请求文章列表页
function requestList(page) {
  let url = apiRoot + `/gzhjs?cb=handleList&openid=${openId}&ext=${ext}&page=${page}&t=${new Date().getTime()}`;
  console.log(`[%s] ${url}`, new Date());
  let result = request(url, {
    timeout: 5000,
    headers: mockHeaders,
  });
  let body = result.data.toString();
  ensureResult(body);
  try {
    eval(body);
  } catch (ex) {
    ex.name = 'HandleListError';
    ex.url = ex.url || url;
    ex.originBody = ex.originBody || body;
    return onerror(ex);
  }
}

// 请求文章详情页
function requestArticle(link) {
  let url = apiRoot + link;
  console.log(`[%s] ${url}`, new Date());
  let result = request(url, {
    timeout: 5000,
    headers: mockHeaders,
  });
  let body = result.data.toString();
  let headers = result.headers || {};
  let redirUrl = headers['location'] || '';
  ensureResult(body);
  if (String(result.status)[0] !== '3' ||
      !redirUrl || redirUrl.indexOf('antispider') >= 0) {

    let err = new Error('Request article failed.');
    err.name = 'RequestArticleError';
    err.url = url;
    err.originBody = body;
    return onerror(err);
  }
  console.log(`[%s] ${redirUrl}`, new Date());
  let redirResult = request(redirUrl, {timeout: 5000});
  let redirBody = redirResult.data.toString();
  ensureResult(redirBody);
  return redirBody;
}

function handleList(res) {
  let items = res.items || [];
  for (let item of items) {
    let doc = new xmldoc.XmlDocument(item);
    let node = doc.children[1].children[3].children;
    let articleTitle = node[2].val.trim();
    let articleLink = node[3].val.trim();
    handleArticle(articleLink, articleTitle);
    sleep(60);
  }
}

function handleArticle(link, title) {
  const raw = requestArticle(link);
  const filePath = path.join(outputDir, `${title}.html`);
  fs.writeFileSync(filePath, raw, 'utf-8');
}

for (let page = 1 + skipPage; page <= totalPage; page++) {
  requestList(page);
  sleep(60);
}


