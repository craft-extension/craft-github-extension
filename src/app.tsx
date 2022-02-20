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
} from 'antd';

import * as utils from './utils';


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
    const onFinish = React.useCallback((sync) => {
        // Note: 同步到 Github！
        const currentToken = form.getFieldValue('github_token');
        if (!currentToken || currentToken.length < 5) {
            message.error('github token非法');
            return;
        }
        if (currentToken !== config.github_token) {
            craft.storageApi.put('CONFIG', JSON.stringify({github_token: currentToken}));
        }
        utils.syncToGithub(sync, form)
    }, [form.getFieldValue('github_token'), config.github_token]);


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
                onClick={onFinish.bind(null, false)}>
                调试
            </Button>
        </Form>
    );
}

export function initApp() {
    ReactDOM.render(<App/>, document.getElementById('react-root'))
}
