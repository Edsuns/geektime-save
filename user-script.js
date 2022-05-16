// ==UserScript==
// @name         极客时间专栏文章和音频下载
// @namespace    https://github.com/Edsuns
// @version      0.5.0
// @description  在极客时间专栏内容页面增加一个保存按钮，点击后将正文以markdown格式下载保存，同时下载文章音频
// @author       Edsuns
// @match        *://time.geekbang.org/column/article/*
// @grant        none
// @require      https://unpkg.com/ajax-hook@1.8.3/dist/ajaxhook.min.js
// @require      https://unpkg.com/showdown@2.1.0/dist/showdown.js
// ==/UserScript==

(function () {
  'use strict'

  const KEY_CONTENT = "_md_content"
  const KEY_TITLE = "_md_title"
  const KEY_AUDIO = "_audio_url"
  const FILE_TYPE = "application/html"
  const articleRequestUrlRegex = /^https?:\/\/time\.geekbang\.org\/serv\/v\d\/article/
  const mdService = new showdown.Converter()

  hookAjax({
    //拦截回调
    onreadystatechange: function (xhr) {
      if (xhr.readyState === 4 && articleRequestUrlRegex.test(xhr.responseURL)) {
        // console.log(xhr.response)

        let resJson = JSON.parse(xhr.response)
        if (!resJson.data.article_title) return

        let titleOriginal = resJson.data.article_title
        let titleTxt = `<h1>${titleOriginal}</h1>`
        let title = removeIllegalFilenameCharacters(titleOriginal)

        let createdAt = new Date(resJson.data.article_ctime * 1000).toLocaleDateString()
        let created = `<p><i>${resJson.data.author_name} | ${createdAt}</i></p>`
        let summary = `<p><i>${resJson.data.article_summary}</i></p>`

        let img = `<p><img src="${resJson.data.article_cover}" alt=""></img></p>`

        let audio = ''
        let audioUrl = resJson.data.audio_download_url
        if (audioUrl) {
          audio = `<audio><source src="./${encodeURI(title + getFileExt(audioUrl))}">
          <source src="${resJson.data.audio_download_url}" controls></audio>`
        }

        let data = resJson.data.article_content
          .replace('<!-- [[[read_end]]] -->', '').replace('<!-- -->', '')

        let html = titleTxt + created + summary + img + audio + data
        const mdContent = html

        sessionStorage.setItem(KEY_TITLE, title)
        sessionStorage.setItem(KEY_AUDIO, resJson.data.audio_download_url)
        sessionStorage.setItem(KEY_CONTENT, mdContent)

        addSaveBtn()
      }
    }
  })

  function addSaveBtn() {
    let saveBtn = document.querySelector("#save_btn")
    if (!saveBtn) {
      saveBtn = document.createElement("div")
      saveBtn.id = "save_btn"
      saveBtn.textContent = "存"
      saveBtn.onclick = () => {
        let title = sessionStorage.getItem(KEY_TITLE)

        let commentsCss = `<style type="text/css">.CommentItemPC_main_2sjJG{list-style-position:inside;width:100%;display:flex;flex-direction:row;margin-top:26px;border-bottom:1px solid hsla(0,0%,91.4%,.6)}.CommentItemPC_main_2sjJG:hover .CommentItemPC_btnMore_pcY1J{opacity:1}.CommentItemPC_main_2sjJG.CommentItemPC_expand_3q0V3,.CommentItemPC_main_2sjJG a{border-bottom:none}.CommentItemPC_main_2sjJG .CommentItemPC_avatar_3FLYR{width:34px;height:34px;flex-shrink:0;border-radius:50%}.CommentItemPC_main_2sjJG .CommentItemPC_info_36Chp{margin-left:.5rem;flex-grow:1;padding-bottom:20px}.CommentItemPC_main_2sjJG .CommentItemPC_info_36Chp .CommentItemPC_bd_2_Qra{margin-top:12px;color:#505050;-webkit-font-smoothing:antialiased;font-size:14px;font-weight:400;white-space:pre-wrap;word-break:break-all;line-height:24px}.CommentItemPC_main_2sjJG .CommentItemPC_info_36Chp .CommentItemPC_username_2zFoi{font-size:16px;color:#3d464d;font-weight:500;-webkit-font-smoothing:antialiased;line-height:34px}.CommentItemPC_main_2sjJG .CommentItemPC_control_3klNV{flex-direction:row;justify-content:space-between;margin-top:15px}.CommentItemPC_main_2sjJG .CommentItemPC_control_3klNV,.CommentItemPC_main_2sjJG .CommentItemPC_control_3klNV .CommentItemPC_actions_3_7jo{display:flex;align-items:center}.CommentItemPC_main_2sjJG .CommentItemPC_btnMore_pcY1J{font-size:12px;color:#888;margin-right:44px;opacity:0;cursor:pointer;transition:opacity .2s}.CommentItemPC_main_2sjJG .CommentItemPC_btnComment_3r0uu,.CommentItemPC_main_2sjJG .CommentItemPC_btnPraise_24fTa{display:flex;align-items:center;font-size:$font-size-headline;text-decoration:none;cursor:pointer;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;user-select:none}.CommentItemPC_main_2sjJG .CommentItemPC_btnComment_3r0uu i,.CommentItemPC_main_2sjJG .CommentItemPC_btnPraise_24fTa i{color:#888;display:inline-block;font-size:15px;margin-right:4px;height:27px;width:15px}.CommentItemPC_main_2sjJG .CommentItemPC_btnComment_3r0uu i.CommentItemPC_on_22PbU,.CommentItemPC_main_2sjJG .CommentItemPC_btnPraise_24fTa i.CommentItemPC_on_22PbU{background:url(data:image/png;base64,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) no-repeat 50%;background-size:15px}.CommentItemPC_main_2sjJG .CommentItemPC_btnComment_3r0uu span,.CommentItemPC_main_2sjJG .CommentItemPC_btnPraise_24fTa span{color:#888;font-size:12px;font-weight:400}.CommentItemPC_main_2sjJG .CommentItemPC_btnComment_3r0uu:hover i,.CommentItemPC_main_2sjJG .CommentItemPC_btnComment_3r0uu:hover span,.CommentItemPC_main_2sjJG .CommentItemPC_btnComment_3r0uu span.CommentItemPC_on_22PbU,.CommentItemPC_main_2sjJG .CommentItemPC_btnPraise_24fTa:hover i,.CommentItemPC_main_2sjJG .CommentItemPC_btnPraise_24fTa:hover span,.CommentItemPC_main_2sjJG .CommentItemPC_btnPraise_24fTa span.CommentItemPC_on_22PbU{color:#fa8919}.CommentItemPC_main_2sjJG .CommentItemPC_btnComment_3r0uu{margin-right:44px}.CommentItemPC_main_2sjJG .CommentItemPC_more_2zG2X{font-size:13px;color:#b2b2b2;height:16px;padding-top:8px}.CommentItemPC_main_2sjJG .CommentItemPC_more_2zG2X span{font-weight:500}.CommentItemPC_main_2sjJG .CommentItemPC_more_2zG2X i,.CommentItemPC_main_2sjJG .CommentItemPC_more_2zG2X span{height:16px;line-height:16px;display:inline-block;vertical-align:top}.CommentItemPC_main_2sjJG .CommentItemPC_reply_10o3O{margin-top:18px;border-radius:4px;background-color:#f6f7fb}.CommentItemPC_main_2sjJG .CommentItemPC_reply_10o3O .CommentItemPC_content_3KxQP{color:#505050;-webkit-font-smoothing:antialiased;font-size:14px;font-weight:400;white-space:pre-wrap;word-break:break-word;padding:20px 20px 20px 24px}.CommentItemPC_main_2sjJG .CommentItemPC_time_3Hkul{color:#b2b2b2;font-size:14px}.CommentItemPC_topTag_3ZqVl{height:15px;line-height:15px;width:34px;overflow:hidden;font-size:10px;color:#fff;background:#cbcbcb;text-align:center;display:inline-block;border-radius:2px;vertical-align:top;margin-top:10px;font-weight:400}</style>`
        let comments = document.querySelector("#app div.Index_comments_3HIaO")
        comments = comments ? commentsCss + comments.outerHTML : ''

        let filename = title + ".html"
        createAndDownloadFile(sessionStorage.getItem(KEY_CONTENT) + comments, filename, FILE_TYPE)

        let audioUrl = sessionStorage.getItem(KEY_AUDIO)
        if (audioUrl) {
          downloadUrl(title + getFileExt(audioUrl), audioUrl)
        }
      }
      setSaveBtnStyle(saveBtn)
      document.querySelector("#app").appendChild(saveBtn)
    }
  }

  function setSaveBtnStyle(saveBtn) {
    saveBtn.style.position = "fixed"
    saveBtn.style.bottom = "2em"
    saveBtn.style.right = "2em"
    saveBtn.style.borderRadius = "50%"
    saveBtn.style.backgroundColor = "#f6f7f9"
    saveBtn.style.height = "38px"
    saveBtn.style.width = "38px"
    saveBtn.style.textAlign = "center"
    saveBtn.style.lineHeight = "38px"
    saveBtn.style.border = "1px solid #f6f7f9"
    saveBtn.style.cursor = "pointer"
  }

  function createAndDownloadFile(content, filename, contentType) {
    let aTag = document.createElement('a')
    let blob = new Blob([content], { type: contentType })
    aTag.download = filename
    aTag.href = URL.createObjectURL(blob)
    aTag.click()
    URL.revokeObjectURL(blob)
  }

  function getFileExt(filename) {
    let idx = filename.lastIndexOf('.')
    return idx > -1 ? filename.substring(idx) : ''
  }

  function removeIllegalFilenameCharacters(filename) {
    filename = filename.replace(' | ', '｜')
    filename = filename.replace('|', '｜')
    return filename.replaceAll(/[\\/:*?"<>]/g, '')
  }

  function downloadUrl(filename, url) {
    var a = document.createElement("a")
    a.download = filename
    a.href = url
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }
})()