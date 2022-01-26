// @ts-nocheck
import {initApp} from './app';
import './style.css';
// Note: 增加动态调整主题的能力
import 'antd/dist/antd.variable.min.css';
import * as auth from './tencent-cos/auth';

console.log('shit');
initApp();
craft.dataApi.addBlocks([craft.blockFactory.textBlock({
    content: '牛逼'
})]);
setTimeout(() => {
    // craft.dataApi.getCurrentPage().then(res => {
    //     console.log('res:', res);
    // })
    // Note: 测试用
    craft.httpProxy.fetch({
        url: 'https://res.craft.do/user/full/747e0824-8866-cf67-b3ae-2e207380d1f9/doc/74363326-27d3-4061-b2b2-8a0674ec580b/A6226188-A6F5-4FD3-B6A3-E377E74C686E_2/DjmVSLnIGfcRNr0el4lEVOBh1UTdxRz23mhh3uFkTBcz/Image.png',
        method: 'GET',
        mode: 'cors',
    }).then(res => res.data?.body?.arrayBuffer()).then((buffer) => {
        if (buffer) {
            const blob = new Blob([buffer], {
                type: 'image/png',
            });
            // FIXME: 坑： craft.httpProxy.fetch 目前不支持二进制传输，只支持纯文本
            craft.httpProxy.fetch({
                url: 'https://blog-static-1254272402.cos.ap-beijing.myqcloud.com/A6226188-A6F5-4FD3-B6A3-E377E74C686E_2_Image.png',
                method: 'PUT',
                headers: {
                    Authorization: auth.getAuthorization({
                        SecretId: 'AKIDta1C7lCOK0RcYEfqlQq1wc2C6k9JDrFN',
                        SecretKey: 'tWuCE1YqseBSUGm33nIYZKp56rNdePt7',
                        Method: 'PUT',
                        Pathname: '/A6226188-A6F5-4FD3-B6A3-E377E74C686E_2_Image.png',
                        Headers: {
                            // Note: 指定文件类型
                            'Content-Type': 'image/png'
                        }
                    }),
                    'Content-Type': 'image',
                },
                body: blob,
            });
        }
        
    });
    
}, 1000);
/*craft.env.setListener(env => {
    console.log('env:', env);
    if (env.platform === 'Mac') {
        // Note: Mac 端有 bug，刚加载的时候就读取 localstorage 是无法读取的，官方会在下个版本修复
        setTimeout(() => {
            initApp()
        }, 3000)
    } else {
        // Note: Web 不存在此问题
        initApp();
    }
});*/
