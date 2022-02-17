// @ts-nocheck

import {
    notification,
    message,
} from 'antd';

import {Octokit} from "octokit";

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

const GITHUB_CONFIG = {
    owner: 'Xheldon',
    branch: 'master',
    ci_repo: 'craft_publish_ci',
    repo: 'x_blog_src',
    ci_path: 'content.md',
};

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
                }

                if (left === 'cos') {
                    cosPath = right;
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
                metaMarkdown += `title: ${title}`;
            }
        }
        
        // Note: 此处获取到 markdown，加上所有配置也齐全了，可以开始同步了
        // Note: 需要先发送获取该文件的请求，以检查该文件是否存在，如果存在，则需要提供该文件的 sha（在返回的结果中有该值）
        //  如果不存在则不需要该值
        const octokit = new Octokit({auth: form.getFieldValue('github_token')});
        // Note: 先获取该地址，如果不存在则新建，如果存在则需要拿到该文件的 sha 值进行更新
        let content = '';
        if (metaMarkdown) {
            content = metaMarkdown + '---\n\n' + markdown;
        } else {
            content = markdown;
        }
        console.log('当前文档内容:\n', content + '\n');
        if (!sync) {
            return;
        }
        octokit.rest.repos.getContent({
            owner: GITHUB_CONFIG.owner,
            repo: GITHUB_CONFIG.ci_repo,
            path: GITHUB_CONFIG.ci_path,
        }).then((res) => {
            // Note: 更新
            if ([200, 201].includes(res.status)) {
                message.error('文件存在，更新中...');
                console.log('res:', res.data);
                // Note: 获取博客仓库的文件是否存在的信息，如果不存在则不需要传 sha 值
                octokit.rest.repos.getContent({
                    owner: GITHUB_CONFIG.owner,
                    repo: GITHUB_CONFIG.repo,
                    path,
                }).then(result => {
                    if (result.data && result.data.sha) {
                        const lastUpdateTime = (new Date() as any).format('yyyy-MM-dd hh:mm:ss') + ' +0800';
                        console.log('更新时间:', lastUpdateTime);
                        if (metaMarkdown) {
                            content = metaMarkdown + `sha: ${result.data.sha}\n` + `lastUpdateTime: ${lastUpdateTime}\n---\n\n` + markdown;
                        }
                        console.log(`修改 即将同步的内容到「${path}」：\n${content}`);
                        octokit.rest.repos.createOrUpdateFileContents({
                            owner: GITHUB_CONFIG.owner,
                            repo: GITHUB_CONFIG.ci_repo,
                            branch: GITHUB_CONFIG.branch,
                            path: GITHUB_CONFIG.ci_path,
                            message: `${title} 更新！`,
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
                    }
                })
                .catch(err => {
                    if (err.status === 404) {
                        message.error('文件不存在，新建中...', err);
                        console.log(`新建 即将同步的内容到「${path}」：\n${content}`);
                        octokit.rest.repos.createOrUpdateFileContents({
                            owner: GITHUB_CONFIG.owner,
                            repo: GITHUB_CONFIG.ci_repo,
                            branch: GITHUB_CONFIG.branch,
                            sha: res.data.sha,
                            path: GITHUB_CONFIG.ci_path,
                            message: `${title} 发布！`,
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
                    }
                });
            } else {
                message.error('状态成功但码不是 20x，请控制台查看');
                console.log('res', res);
            }
        }).catch((err) => {
            message.error('未知错误，控制台查看');
            console.log('err:', err);
        });
    }
}
