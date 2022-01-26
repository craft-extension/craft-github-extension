// @ts-nocheck

import {
    notification,
    message,
} from 'antd';

import {Octokit} from "octokit";

import * as api from './api';
import {initApp} from './app';

Date.prototype.format = function(fmt) {
    var o = {
       "M+" : this.getMonth()+1,                 //月份
       "d+" : this.getDate(),                    //日
       "h+" : this.getHours(),                   //小时
       "m+" : this.getMinutes(),                 //分
       "s+" : this.getSeconds(),                 //秒
       "q+" : Math.floor((this.getMonth()+3)/3), //季度
       "S"  : this.getMilliseconds()             //毫秒
   };
   if(/(y+)/.test(fmt)) {
           fmt=fmt.replace(RegExp.$1, (this.getFullYear()+"").substr(4 - RegExp.$1.length));
   }
    for(var k in o) {
       if(new RegExp("("+ k +")").test(fmt)){
            fmt = fmt.replace(RegExp.$1, (RegExp.$1.length==1) ? (o[k]) : (("00"+ o[k]).substr((""+ o[k]).length)));
        }
    }
   return fmt;
}

export const syncToGithub = async (sync, form) => {
    const result = await craft.dataApi.getCurrentPage();
    if (result.status !== 'success') {
        // Note：获取页面内容失败
        console.error('错误: 获取页面内容失败');
        notification['error']({
            message: '获取页面内容失败',
            description: '无法获取当前页面内容，原因未知，可以在 Web 编辑器中加载该插件，如果仍然失败可以控制台查看相关信息'
        });
    } else {
        // Note: 第一个是 table，构建后发送
        console.log('当前文档内容:', result);
        const data = result.data.subblocks;
        const title = result.data.content[0].text + '\n'; // Note: 标题作为博客文章名
        let markdown = craft.markdown.craftBlockToMarkdown(result.data.subblocks.slice(1), 'common', {
            tableSupported: true,
        })
        let metaMarkdown = '';
        const metaTable: any = data.slice(0, 1)[0];
        let path = '';
        let cosPath = '';
        if (metaTable.type !== 'tableBlock') {
            message.error('第一个元素必须是 table 元素以提供必要信息如 path 等！');
            return;
        } else {
            metaTable.rows.forEach((row: any) => {
                const left = (row.cells[0].block as any).content[0].text.trim();
                const right = (row.cells[1].block as any).content[0].text.trim();
                if (left === 'path') {
                    // Note: path 信息不放在 meta 中
                    path = right;
                    return;
                }

                if (left === 'cos') {
                    cosPath = right;
                    return;
                }

                const isMultiLine: string[] = right.split('-:');
                if (isMultiLine.length > 1) {
                    metaMarkdown += `${left}:\n`;
                    isMultiLine.filter(Boolean).forEach(tag => {
                        metaMarkdown += `    - ${tag.trim()}\n`;
                    });
                } else {
                    metaMarkdown += `${(row.cells[0].block as any).content[0].text}: ${(row.cells[1].block as any).content[0].text}\n`;
                }
            });
            if (metaMarkdown) {
                metaMarkdown = '---\n' + metaMarkdown;
                metaMarkdown += `title: ${title}`
            }
        }
        // Note: 仅保存配置，不同步
        if (!sync) {
            let imgUrlList = [...(markdown.matchAll(/^!\[.*]\((.*)\)$/mg))].map((imgEntry) => imgEntry[1]);
            console.log('匹配到的图片', imgUrlList);
            let imgUrlKeyMap = [];
            let fileUrlList = imgUrlList.map((imgUrl) => {
                // Note: 不带 . （没有后缀名）的图片是 Web 端上传的，Mac 端上传的图片带后缀，我们只处理带后缀的
                //  详见我在官方论坛提的问题：https://forum.developer.craft.do/t/what-the-image-unique-id/371
                if (imgUrl.includes('.')) {
                    let arr = new URL(imgUrl).pathname.split('/');
                    // Note: 形如 img/in-post/qing-zheng-lu-yu/xxxxx_Image.png;
                    const name = `img/in-post/${cosPath}${arr[6]}_${arr[arr.length - 1]}`;
                    imgUrlKeyMap.push({
                        name,
                        url: imgUrl,
                    });
                    return name;
                }
            });
            /**
             * 图片处理是将上传到 res.craft.do 的图片上传到腾讯云 cos，有以下几步:
             * 1. 获取页面 markdown
             * 2. 获取 markdown 的图片的 nameList
             * 3. 获取 metaMarkdown 中配置的，文章中对应的图片目录中的图片 fileList
             * 4. 对比 fileList 和 nameList，发现前者新增的 url 则上传，如果发现缺少的，则删除。
             */
            // Note: delimier 应该是文章对应图片所在位置的目录
            api.setSecret(form);
            console.log('secret:', api.secret);
            api.getFileList({
                prefix: `img/in-post/${cosPath}`,
            }).then((data = []) => {
                console.log('data:', data);
                // Note: 如果有数据，则是形如：
                // {
                //     ETag: "\"8082dcfa7a8dc07d3cc3dac42126d47f\""
                //     Key: "img/in-post/.DS_Store"
                //     LastModified: "2021-10-19T02:02:27.000Z"
                //     Owner: {ID: '1254272402', DisplayName: '1254272402'}
                //     Size: "10244"
                //     StorageClass: "STANDARD"
                // }[]
                const uploadList = [];
                const deleteList = [];
                // Note: data 存在说明此次为更新文件，摘出需要更新的 upload 即可
                // Note: 第一步：找出远端有，本地无的文件，删除
                data.forEach(fileName => {
                    if (!fileUrlList.includes(fileName)) {
                        deleteList.push(fileName);
                    }
                });
                // Note: 第二步：找出远端无，本地有的文件，新增
                fileUrlList.forEach(fileName => {
                    if (!data.includes(fileName)) {
                        uploadList.push(fileName);
                    }
                });
                // FIXME: 删除后，是否需要刷新 COS？不用的话可能 CDN 需要回流，不会提前预热
                deleteList.forEach(fileName => {
                    console.log(`即将删除:`, fileName);
                });
                console.log('imgUrlKeyMap:', imgUrlKeyMap);
                api.getCraftImages(imgUrlKeyMap).then((imgs) => {
                    console.log('imgs:', imgs);

                    api.uploadFiles(imgs.map(img => {
                        console.log('ff:', img.blob.data.body._arrayBuffer);
                        return img.blob.data.body.arrayBuffer().then(buffer => {
                            console.log('buffer', buffer);
                            return {
                                blob: new Blob([buffer], {
                                    type: `image/${img.suffix}`
                                }),
                                name: img.name,
                            }
                        });
                    })).catch((err) => {
                        console.log('批量上传文件失败:', err);
                    });
                });
            });
            //
            // console.log(`即将同步的内容到「${path}」：\n${metaMarkdown ? metaMarkdown + '---\n\n' + markdown : markdown}`);
            return;
        }
        // Note: 此处获取到 markdown，加上所有配置也齐全了，可以开始同步了
        // Note: 需要先发送获取该文件的请求，以检查该文件是否存在，如果存在，则需要提供该文件的 sha（在返回的结果中有该值）
        //  如果不存在则不需要该值
        const octokit = new Octokit({auth: form.getFieldValue('github_token')});
        // Note: 先获取该地址，如果不存在则新建，如果存在则需要拿到该文件的 sha 值进行更新
        const owner = form.getFieldValue('github_owner').trim();
        const repo = form.getFieldValue('github_repo').trim();
        const branch = form.getFieldValue('github_branch').trim() || 'master';
        const git_message = form.getFieldValue('github_message').trim();
        let content = '';
        if (metaMarkdown) {
            content = metaMarkdown + '---\n\n' + markdown;
        } else {
            content = markdown;
        }
        octokit.rest.repos.getContent({
            owner,
            repo,
            path,
        }).then((res) => {
            // Note: 更新
            if ([200, 201].includes(res.status)) {
                message.error('文件存在，更新中...');
                const lastUpdateTime = (new Date() as any).format('yyyy-MM-dd hh:mm:ss') + ' +0800';
                console.log('更新时间:', lastUpdateTime);
                if (metaMarkdown) {
                    content = metaMarkdown + `lastUpdateTime: ${lastUpdateTime}\n---\n\n` + markdown;
                }
                console.log(`修改 即将同步的内容到「${path}」：\n${content}`);
                octokit.rest.repos.createOrUpdateFileContents({
                    owner,
                    repo,
                    branch,
                    path,
                    message: git_message,
                    sha: (res.data as any).sha,
                    content: btoa(unescape(encodeURIComponent(content))), // 文件已经存在，则加上 lastUpdateTime
                }).then((data) => {
                    if ([200, 201].includes(data.status)) {
                        message.info('更新成功！');
                    } else {
                        message.info('更新似乎成功了...');
                    }
                }).catch((err) => {
                    message.error('更新失败，请打开控制台查看（Web 可以看 Log，Mac 还不行）')
                    console.log('更新文件错误:', err);
                });
            } else {
                message.error('状态成功但码不是 20x，请控制台查看');
                console.log('res', res);
            }
        }).catch((err) => {
            if (err.status === 404) {
                message.error('文件不存在，新建中...', err);
                console.log(`新建 即将同步的内容到「${path}」：\n${content}`);
                octokit.rest.repos.createOrUpdateFileContents({
                    owner,
                    repo,
                    branch,
                    path,
                    message: git_message,
                    content: btoa(unescape(encodeURIComponent(content))),
                }).then((data) => {
                    if ([200, 201].includes(data.status)) {
                        message.info('新建成功！');
                    } else {
                        message.info('新建似乎成功了...');
                    }
                }).catch((err) => {
                    message.error('新建失败，请打开控制台查看（Web 可以看 Log，Mac 还不行）')
                    console.log('新建错误:', err);
                });
            } else {
                message.error('未知错误，控制台查看');
                console.log('err:', err);
            }
        });
    }
}
