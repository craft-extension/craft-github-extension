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

const {Option} = Select;

const layout = {
    labelCol: {span: 8},
    wrapperCol: {span: 16},
};
const tailLayout = {
    wrapperCol: {span: 24},
};

const DEFAULT_CONFIG = {
    config: '',
    name: '',
    github_token: '',
    github_owner: '',
    github_repo: '',
    github_branch: 'master',
    github_path: '',
    github_message: '',
    tencent_cos_secret_id: '',
    tencent_cos_secret_key: '',
    tencent_cos_bucket: '',
    tencent_cos_region: ''
};

const App: React.FC<{}> = () => {
    const isDarkMode = useCraftDarkMode();
    // Note: 是否展示提示框
    const [showTips, setShowTips] = React.useState(false);
    // Note: 列出之前使用过的配置
    const [configList, setConfigList] = React.useState([DEFAULT_CONFIG]);

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

    // Note: 是否显示 tips
    React.useEffect(() => {
        (async function () {
            const result = await craft.storageApi.get('SHOW_TIPS');
            if (result.status !== 'success') {
                setShowTips(true);
            } else {
                if (result.data) {
                    setShowTips(JSON.parse(result.data));
                } else {
                    craft.storageApi.put('SHOW_TIPS', JSON.stringify(true));
                }
            }
        })();
    }, []);

    // Note: 获取之前的配置
    React.useEffect(() => {
        (async function () {
            const result = await craft.storageApi.get('CONFIG_LIST');
            if (result.status !== 'success') {
                setConfigList([DEFAULT_CONFIG]);
            } else {
                setConfigList(JSON.parse(result.data));
            }
        })();
    }, []);

    // Note: 获取上次的配置
    React.useEffect(() => {
        (async function () {
            const result = await craft.storageApi.get('LAST_CONFIG');
            if (result.status !== 'success') {
                form.setFieldsValue(DEFAULT_CONFIG);
            } else {
                form.setFieldsValue(JSON.parse(result.data));
            }
        })();
    }, []);

    const [form] = Form.useForm();

    const onConfigChange = React.useCallback((value: string) => {
        configList.forEach((config) => {
            if (value === (config as any).config) {
                form.setFieldsValue(config);
                // Note: 设置最后一个使用的配置项
                craft.storageApi.put('LAST_CONFIG', JSON.stringify(form.getFieldsValue()));
            }
        });
    }, [configList]);

    const onFinish = React.useCallback((sync) => {
        // Note: 提交后也记录最后一次的使用配置
        // Note: 此时已经验证通过了
        const currentValue = {
            ...form.getFieldsValue(),
            config: form.getFieldValue('name'),
        };
        if (configList.every(config => config.name !== form.getFieldValue('name'))) {
            // Note: 修改了 name，因此需要重新保存一份
            craft.storageApi.put('LAST_CONFIG', JSON.stringify(currentValue));
            const currentConfigList = [
                ...configList.map(config => config.config && config).filter(Boolean),
                currentValue,
            ];
            // Note: 将新值保存到本地
            form.setFieldsValue(currentValue);
            setConfigList(currentConfigList);
            craft.storageApi.put('CONFIG_LIST', JSON.stringify(currentConfigList));
        } else {
            // Note: 未更新 name，有可能更新其他值，因此存储起来
            const newConfigList = configList.slice().map((config) => {
                if (config.name === form.getFieldValue('name')) {
                    return form.getFieldsValue();
                }
                return config;
            })
            setConfigList(newConfigList);
            craft.storageApi.put('LAST_CONFIG', JSON.stringify(form.getFieldsValue()));
            craft.storageApi.put('CONFIG_LIST', JSON.stringify(newConfigList));
        }
        // Note: 同步到 Github！
        utils.syncToGithub(sync, form)
    }, [configList]);

    const onReset = React.useCallback(() => {
        if (!form.getFieldValue('config')) {
            form.setFieldsValue(DEFAULT_CONFIG);
        }
    }, [configList]);

    const onDelete = React.useCallback(() => {
        const currentConfig = form.getFieldValue('config');
        if (!currentConfig) {
            return;
        }
        const newConfigList: Array<Config | undefined> = configList.map((config) => {
            if (currentConfig && config.config !== currentConfig) {
                return config;
            }
        }).filter(Boolean);
        setConfigList(newConfigList as Config[]);
        form.setFieldsValue(DEFAULT_CONFIG);
        craft.storageApi.put('CONFIG_LIST', JSON.stringify(newConfigList));
        craft.storageApi.put('LAST_CONFIG', JSON.stringify(DEFAULT_CONFIG));
    }, [configList]);

    return (
        <>
            {
                <Row>
                    <Col span={24}>
                        <Alert
                            message="使用说明点击详情查看 👉"
                            type="info"
                            action={
                                <Button size="small" danger onClick={() => {
                                    craft.editorApi.openURL('https://www.xheldon.com/tech/use-craft-extension-to-write-blog.html')
                                }}>
                                    详情
                                </Button>
                            }
                        />
                    </Col>
                </Row>
            }
            {
                <>
                    <Form {...layout} form={form} name="control-hooks" onFinish={onFinish}>
                        <Form.Item name="config" label="已有配置项">
                            <Select
                                placeholder="选择一个配置项或者输入信息"
                                onChange={onConfigChange}
                            >
                                {
                                    configList.map((config, i) => <Option key={i}
                                                                          value={(config as any).config}>{(config as any).config}</Option>)
                                }
                            </Select>
                        </Form.Item>
                        <Form.Item
                            dependencies={['config']}
                        >
                            {({getFieldValue}) =>
                                <>
                                    <Form.Item name="name" label="配置名" rules={[{required: true}]}>
                                        <Input placeholder={'配置项的名字？'}/>
                                    </Form.Item>
                                    <Form.Item
                                        name="github_token"
                                        label="github_token"
                                        rules={[{required: true}]}
                                        tooltip={
                                            <span>Github 的 <a href="" onClick={() => {
                                                craft.editorApi.openURL('https://github.com/settings/tokens/new');
                                            }}>Personal Token</a></span>
                                        }>
                                        <Input.Password placeholder={'Github Personal Token'}/>
                                    </Form.Item>
                                    <Form.Item
                                        name="tencent_cos_secret_id"
                                        label="tencent_cos_secret_id"
                                        rules={[{required: true}]}
                                        tooltip={
                                            <span>腾讯 COS 的 id</span>
                                        }>
                                        <Input.Password placeholder={'腾讯云 COS Secret ID'}/>
                                    </Form.Item>
                                    <Form.Item
                                        name="tencent_cos_secret_key"
                                        label="tencent_cos_secret_key"
                                        rules={[{required: true}]}
                                        tooltip={
                                            <span>腾讯 COS 的 key</span>
                                        }>
                                        <Input.Password placeholder={'腾讯云 COS Secret Key'}/>
                                    </Form.Item>
                                    <Form.Item name="tencent_cos_bucket" label="tencent_cos_bucket" rules={[{required: true}]}
                                               tooltip={'腾讯云 COS bucket'}>
                                        <Input placeholder={'腾讯云 COS bucket'}/>
                                    </Form.Item>
                                    <Form.Item name="tencent_cos_region" label="tencent_cos_region" rules={[{required: true}]}
                                               tooltip={'腾讯云 COS region'}>
                                        <Input placeholder={'腾讯云 COS region'}/>
                                    </Form.Item>
                                    <Form.Item name="github_repo" label="repo" rules={[{required: true}]}
                                               tooltip={'Github 的仓库地址，只需要名字即可，如 "x_blog_src"'}>
                                        <Input placeholder={'仓库名'}/>
                                    </Form.Item>
                                    <Form.Item name="github_branch" label="branch"
                                               tooltip={'当前文档要上传到仓库的分支，默认是 "master"'}>
                                        <Input placeholder={'分支名'}/>
                                    </Form.Item>
                                    <Form.Item name="github_message" label="message" rules={[{required: true}]}
                                               tooltip={'提交信息，如 "由 Craft github 插件添加"'}>
                                        <Input placeholder={'提交信息'}/>
                                    </Form.Item>
                                    <Form.Item {...tailLayout}>
                                        <Button type="primary" htmlType="button" style={{margin: '8px 8px'}}
                                                onClick={onFinish.bind(null, true)}>
                                            确认并同步
                                        </Button>
                                        <Button type="primary" htmlType="button" style={{margin: '8px 8px'}}
                                                onClick={onFinish.bind(null, false)}>
                                            仅保存配置
                                        </Button>
                                        {
                                            Boolean(getFieldValue('config')) ?
                                                <Button htmlType="button" style={{margin: '8px 8px'}}
                                                        onClick={onDelete}>
                                                    删除配置
                                                </Button> :
                                                <Button htmlType="button" style={{margin: '8px 8px'}} onClick={onReset}>
                                                    重置输入
                                                </Button>
                                        }
                                    </Form.Item>
                                </>
                            }
                        </Form.Item>
                    </Form>
                </>
            }
        </>
    );
}

export function initApp() {
    ReactDOM.render(<App/>, document.getElementById('react-root'))
}
