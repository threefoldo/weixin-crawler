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
  'Cookie': 'CXID=870C18F2A7F60593504B09F2D642299E; SUID=9806D771556C860A56469ABC00081AC0; ad=Qyllllllll2QSI$DlllllVBp7wwllllltNtpullllxtlllllROxlw@@@@@@@@@@@; ABTEST=0|1447655412|v1; SUV=005678392A784B02564977F4AC1FE321; weixinIndexVisited=1; SNUID=175F6C3E151030B79E467A35158C8D67; ppinf=5|1447661995|1448871595|Y2xpZW50aWQ6NDoyMDE3fGNydDoxMDoxNDQ3NjYxOTk1fHJlZm5pY2s6NzpyaWNoYXJkfHRydXN0OjE6MXx1c2VyaWQ6NDQ6MDdDMTk5NUE1RjY2OEI3MDdCM0Q3MjhBRjk0QjhDNjFAcXEuc29odS5jb218dW5pcW5hbWU6NzpyaWNoYXJkfA; pprdig=vYoosRiYsly_dG9xF4QZKwieMbWcY4PgXc3JzrBb-fUNhpLIdXnOovlLaFQ80Wh5daXoxUH0xefLMdjdh_85C8BuoQ_XrEnJljk7xdQu04xXmX0Bjj_GVxZ-tzPpNWCHnq_8KitC386i9AZRDuYWHLnIRN-2wi_aJln7Tz9Plog; PHPSESSID=ag3qu15q3s69vnv1kdl4rbpnl4; SUIR=175F6C3E151030B79E467A35158C8D67; ppmdig=1447681981000000154dc1b9b56d4530abda30e346f3be48; sct=7; wapsogou_qq_nickname=; IPLOC=CN3100',
  'Host': 'weixin.sogou.com',
  'User-Agent': userAgent,
};
let skipPage = 0;
let totalPage = 10;
let interval = 60; // 60s

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
    sleep(interval);
  }
}

function handleArticle(link, title) {
  const raw = requestArticle(link);
  const filePath = path.join(outputDir, `${title}.html`);
  fs.writeFileSync(filePath, raw, 'utf-8');
}

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

for (let page = 1 + skipPage; page <= totalPage; page++) {
  requestList(page);
  sleep(interval);
}


