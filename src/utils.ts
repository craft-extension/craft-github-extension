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

export const syncToGithub = async (sync, form, debug = false) => {
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
        console.log('---当前文档内容:', result);
        const data = result.data.subblocks;
        const title = result.data.content[0].text;
        const coverImage = result.data.style?.coverImage;
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
                const left = (row.cells[0]?.block as any)?.content[0]?.text.trim();
                // Note: 通过 API intiMeta 新建的有 block 字段（因为内容是 ''），直接手动新建的没有该字段，因此需要容错处理
                const right = (row.cells[1]?.block as any)?.content[0]?.text.trim();
                // Note: 如果 cell 为空，则 content 为空数组
                if (!right || !left) {
                    return;
                }
                if (left === 'path') {
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
                metaMarkdown += `title: ${title}\n`;
                // Note: 如果 Craft 存在头图，需要将头图作为 header-img，如果是从 unsplash 获取的图片，则还需要带上版权信息，这些都可以通过 res.data.style.coverImage 得到
                //  直接判断 url 中是否有值即可，无需判断 enable 的值
                // Note：因为 title 是每次不会变化的，因此此处使用 title 作为 image 的名字
                if (coverImage) {
                    const {url, attribution} = coverImage;
                    if (url) {
                        metaMarkdown += `header-img: ${url}\n`;
                    }
                    if (attribution) {
                        // Note: 从 unsplash 来的，图片地址包含了 url，需要提取出来
                        const [author, href] = attribution.split('||');
                        if (author) {
                            metaMarkdown += `header-img-credit: ${author}\n`;
                        }
                        if (href) {
                            // craft 的 link 是这样的：https://unsplash.com/@_miltiadis_?utm_source=craft_docs&utm_medium=referral，我也学他搞一个
                            metaMarkdown += `header-img-credit-href: ${href}?utm_source=xheldon_blog&utm_medium=referral\n`;
                        }
                    }
                }
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
        console.log('---当前文档内容:\n', content + '\n');
        if (!sync) {
            return;
        }
        octokit.rest.repos.getContent({
            owner: GITHUB_CONFIG.owner,
            repo: GITHUB_CONFIG.ci_repo,
            path: GITHUB_CONFIG.ci_path,
        }).then(res => {
            // Note: 更新
            if ([200, 201].includes(res.status)) {
                // Note: 获取博客仓库的文件是否存在的信息，如果不存在则不需要传 sha 值
                octokit.rest.repos.getContent({
                    owner: GITHUB_CONFIG.owner,
                    repo: GITHUB_CONFIG.repo,
                    path,
                }).then(result => {
                    if (result.data && result.data.sha) {
                        message.error('文件存在，更新中...');
                        const lastUpdateTime = (new Date() as any).format('yyyy-MM-dd hh:mm:ss') + ' +0800';
                        console.log('更新时间:', lastUpdateTime);
                        if (metaMarkdown) {
                            content = metaMarkdown + `sha: ${result.data.sha}\n` + `lastUpdateTime: ${lastUpdateTime}\n---\n\n` + markdown;
                        }
                        console.log(`修改「${path}」：\n${content}`);
                        octokit.rest.repos.createOrUpdateFileContents({
                            owner: GITHUB_CONFIG.owner,
                            repo: GITHUB_CONFIG.ci_repo,
                            branch: GITHUB_CONFIG.branch,
                            path: GITHUB_CONFIG.ci_path,
                            message: `${debug ? 'DEBUG ' : ''}${title} 更新！`,
                            sha: (res.data as any).sha, // Note: 注意此处是 res 不是 result
                            content: btoa(unescape(encodeURIComponent(content))),
                        }).then((data) => {
                            if ([200, 201].includes(data.status)) {
                                message.info('更新成功！');
                            } else {
                                message.info('更新似乎成功了...');
                            }
                        }).catch((err) => {
                            message.error('更新失败！');
                            console.log('更新文件错误:', err);
                        });
                    }
                })
                .catch(err => {
                    if (err.status === 404) {
                        message.error('文件不存在，新建中...');
                        console.log(`新建「${path}」：\n${content}`);
                        octokit.rest.repos.createOrUpdateFileContents({
                            owner: GITHUB_CONFIG.owner,
                            repo: GITHUB_CONFIG.ci_repo,
                            branch: GITHUB_CONFIG.branch,
                            path: GITHUB_CONFIG.ci_path,
                            sha: (res.data as any).sha, // Note: 注意此处是 res 不是 result
                            message: `${debug ? 'DEBUG ' : ''}${title} 发布！`,
                            content: btoa(unescape(encodeURIComponent(content))),
                        }).then((data) => {
                            if ([200, 201].includes(data.status)) {
                                message.info('新建成功！');
                            } else {
                                message.info('新建似乎成功了...');
                            }
                        }).catch((err) => {
                            message.error('新建失败！');
                            console.log('新建错误:', err);
                        });
                    }
                });
            } else {
                message.error('获取 ci_path 异常');
                console.log('res', res);
            }
        }).catch((err) => {
            message.error('未知错误，控制台查看');
            console.log('err:', err);
        });
    }
}
