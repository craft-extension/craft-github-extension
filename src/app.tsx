import * as React from 'react'
import * as ReactDOM from 'react-dom'
import {
    Row,
    Col,
    ConfigProvider,
    Alert,
    Button,
    Input,
    Form,
    Select,
    message,
    notification,
} from 'antd';

import * as utils from './utils';
import {initMeta} from './config';


interface Config {
    config: string;
    name: string;
    github_token: string;
    github_owner: string;
    github_repo: string;
    github_branch: string;
    github_path: string;
    github_message: string;
    tencent_cos_secret_id: string;
    tencent_cos_secret_key: string;
    tencent_cos_bucket: string;
    tencent_cos_region: string;
};


const layout = {
    labelCol: {span: 8},
    wrapperCol: {span: 16},
};
const tailLayout = {
    wrapperCol: {span: 24},
};

const DEFAULT_CONFIG = {
    github_token: '',
}

const App: React.FC<{}> = () => {
    const isDarkMode = useCraftDarkMode();
    // Note: 列出之前使用过的配置
    const [config, setConfig] = React.useState(DEFAULT_CONFIG);

    function useCraftDarkMode() {
        const [isDarkMode, setIsDarkMode] = React.useState(false);

        React.useEffect(() => {
            craft.env.setListener(env => setIsDarkMode(env.colorScheme === 'dark'));
        }, []);

        return isDarkMode;
    }

    React.useEffect(() => {
        if (isDarkMode) {
            // Note: 根据应用主题模式，适配 UI，各种颜色配置详见：https://ant-design.gitee.io/docs/react/customize-theme-variable-cn
            ConfigProvider.config({
                theme: {
                    primaryColor: '#202020',
                }
            });
        } else {
            ConfigProvider.config({
                theme: {
                    primaryColor: '#3bacd5',
                }
            });
        }
    }, [isDarkMode]);

    React.useEffect(() => {
        (async function () {
            const result = await craft.storageApi.get('CONFIG');
            console.log('result', result);
            if (result.status !== 'success') {
                setConfig(DEFAULT_CONFIG);
                form.setFieldsValue(DEFAULT_CONFIG);
            } else {
                try {
                    const config = JSON.parse(result.data);
                    form.setFieldsValue(config);
                    setConfig(config);
                } catch (e) {
                    console.log('配置异常:', e);
                    setConfig(DEFAULT_CONFIG);
                }
                
            }
        })();
    }, []);

    const [form] = Form.useForm();
    const onFinish = React.useCallback((sync, debug = false) => {
        // Note: 同步到 Github！
        const currentToken = form.getFieldValue('github_token');
        if (!currentToken || currentToken.length < 5) {
            message.error('github token非法');
            return;
        }
        if (currentToken !== config.github_token) {
            craft.storageApi.put('CONFIG', JSON.stringify({github_token: currentToken}));
        }
        utils.syncToGithub(sync, form, debug)
    }, [form.getFieldValue('github_token'), config.github_token]);

    const init = React.useCallback(async () => {
        // Note: 新建页面的时候，点击插入默认的 meta 信息到顶部
        const result = await craft.dataApi.getCurrentPage();
        if (result.status !== 'success') {
            console.error('错误：获取页面内容失败');
            notification['error']({
                message: '获取页面内容失败',
                description: '无法获取当前页面内容，原因未知，可以在 Web 编辑器中加载该插件，如果仍然失败可以控制台查看相关信息'
            });
        } else {
            const data = result.data.subblocks;
            const metaTable = data.slice(0, 1)[0];
            if (metaTable.type !== 'tableBlock') {
                // Note: 如果第一个元素不是 table，则插入一个
                //  FIXME: craft 自带的 type 类型，blockFactory 还没有 table 类型，无语子
                const table = (craft.blockFactory as any).tableBlock(initMeta());
                const location = craft.location.indexLocation(result.data.id, 0);
                craft.dataApi.addBlocks([table], location);
            } else {
                message.error('第一个元素已经是 table 了，无需插入 meta！');
            }
        }
    }, []);

    return (
        <Form {...layout} form={form}>
            <Form.Item
                name="github_token"
                label="Github Token"
                rules={[{required: true}]}
                tooltip={'必须的'}
            >
                <Input.Password />
            </Form.Item>
            <Button type="primary" htmlType="button" style={{margin: '8px 8px'}}
                onClick={onFinish.bind(null, true)}>
                更新到 Github！
            </Button>
            <Button type="primary" htmlType="button" style={{margin: '8px 8px'}}
                onClick={onFinish.bind(null, true, true)}>
                Debug 更新到 Github！
            </Button>
            <Button type="primary" htmlType="button" style={{margin: '8px 8px'}}
                onClick={onFinish.bind(null, false)}>
                Log 调试
            </Button>
            <Button type="primary" htmlType="button" onClick={init} style={{margin: '8px 8px'}}>
                初始化
            </Button>
        </Form>
    );
}

export function initApp() {
    ReactDOM.render(<App/>, document.getElementById('react-root'))
}
