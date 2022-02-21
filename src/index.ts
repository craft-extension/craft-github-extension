// @ts-nocheck
import {initApp} from './app';
import './style.css';
// Note: 增加动态调整主题的能力
import 'antd/dist/antd.variable.min.css';

craft.env.setListener(env => {
    console.log('env:', env);
    if (env.platform === 'Mac') {
        // Note: Mac 端有 bug，刚加载的时候就读取 localstorage 是无法读取的，官方会在下个版本修复
        setTimeout(() => {
            initApp()
        }, 1000)
    } else {
        // Note: Web 不存在此问题
        initApp();
    }
});