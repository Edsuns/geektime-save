// ==UserScript==
// @name         极客时间专栏文章保存
// @namespace    https://github.com/Edsuns
// @version      0.5.0
// @description  在极客时间专栏内容页面增加一个保存按钮，点击后将正文以markdown格式下载保存
// @author       L
// @match        *://time.geekbang.org/column/article/*
// @grant        none
// @require      https://unpkg.com/ajax-hook@1.8.3/dist/ajaxhook.min.js
// @require      https://unpkg.com/showdown@2.1.0/dist/showdown.js
// ==/UserScript==

(function () {
  'use strict';

  const KEY_CONTENT = "_md_content";
  const KEY_TITLE = "_md_title";
  const KEY_AUDIO = "_audio_url";
  const FILE_TYPE = "application/md";
  const articleRequestUrlRegex = /^https?:\/\/time\.geekbang\.org\/serv\/v\d\/article/;
  const mdService = new showdown.Converter();

  hookAjax({
    //拦截回调
    onreadystatechange: function (xhr) {
      if (xhr.readyState === 4 && articleRequestUrlRegex.test(xhr.responseURL)) {
        // console.log(xhr.response)

        let resJson = JSON.parse(xhr.response)

        let title = removeIllegalFilenameCharacters(resJson.data.article_title)
        let titleTxt = `<h1>${title}</h1>`

        let createdAt = new Date(resJson.data.article_ctime * 1000).toLocaleDateString()
        let created = `<p><i>${resJson.data.author_name} | ${createdAt}</i></p>`
        let summary = `<p><i>${resJson.data.article_summary}</i></p>`

        let img = `<p><img src="${resJson.data.article_cover}" alt=""></img></p>`

        let audio = ''
        let audioUrl = resJson.data.audio_download_url
        if (audioUrl) {
          audio = `<audio><source src="./${encodeURI(title + getFileExt(audioUrl))}">
          <source src="${resJson.data.audio_download_url}"></audio>`
        }

        let data = resJson.data.article_content.replace('<!-- [[[read_end]]] -->', '')

        let html = titleTxt + created + summary + img + audio + data
        const mdContent = mdService.makeMarkdown(html)

        sessionStorage.setItem(KEY_TITLE, title)
        sessionStorage.setItem(KEY_AUDIO, resJson.data.audio_download_url)
        sessionStorage.setItem(KEY_CONTENT, mdContent)

        addSaveBtn();
      }
    }
  })

  const addSaveBtn = () => {
    let saveBtn = document.querySelector("#save_btn");
    if (!saveBtn) {
      saveBtn = document.createElement("div");
      saveBtn.id = "save_btn";
      saveBtn.textContent = "存";
      saveBtn.onclick = () => {
        let title = sessionStorage.getItem(KEY_TITLE);

        let filename = title + ".md"
        createAndDownloadFile(sessionStorage.getItem(KEY_CONTENT), filename, FILE_TYPE);

        let audioUrl = sessionStorage.getItem(KEY_AUDIO);
        if (audioUrl) {
          downloadUrl(title + getFileExt(audioUrl), audioUrl);
        }
      };
      setSaveBtnStyle(saveBtn);
      document.querySelector("#app").appendChild(saveBtn);
    }
  }

  const setSaveBtnStyle = (saveBtn) => {
    saveBtn.style.position = "fixed";
    saveBtn.style.bottom = "2em";
    saveBtn.style.right = "2em";
    saveBtn.style.borderRadius = "50%";
    saveBtn.style.backgroundColor = "#f6f7f9";
    saveBtn.style.height = "38px";
    saveBtn.style.width = "38px";
    saveBtn.style.textAlign = "center";
    saveBtn.style.lineHeight = "38px";
    saveBtn.style.border = "1px solid #f6f7f9";
    saveBtn.style.cursor = "pointer";
  }

  const createAndDownloadFile = (content, filename, contentType) => {
    let aTag = document.createElement('a');
    let blob = new Blob([content], { type: contentType });
    aTag.download = filename;
    aTag.href = URL.createObjectURL(blob);
    aTag.click();
    URL.revokeObjectURL(blob);
  }

  function getFileExt(filename) {
    let idx = filename.lastIndexOf('.')
    return idx > -1 ? filename.substring(idx) : ''
  }

  function removeIllegalFilenameCharacters(filename) {
    return filename.replaceAll(/[\\/:*?"<>|]/g, '')
  }

  function downloadUrl(filename, url) {
    var a = document.createElement("a");
    a.download = filename;
    a.href = url;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
})();