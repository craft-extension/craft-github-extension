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
  notification,
} from 'antd';

interface Config {
  github_token: string;
  name: string;
  config: string;
  url: string;
};

const { Option } = Select;

const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};
const tailLayout = {
  wrapperCol: { offset: 8, span: 16 },
};

const DEFAULT_CONFIG = {
  config: '',
  name: '',
  github_token: '',
  url: '',
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
            primaryColor: '#eee',
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
    (async function(){
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
    (async function() {
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
    (async function() {
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

  const onFinish = React.useCallback(() => {
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
    // TODO: 同步到 Github！
    (async function() {
      const result = await craft.dataApi.getCurrentPage();
      if (result.status !== 'success') {
        // Note：获取页面内容失败
        console.error('错误: 获取页面内容失败');
        notification['error']({
          message: '获取页面内容失败',
          description: '无法获取当前页面内容，原因未知，可以在 Web 编辑器中加载该插件，如果仍然失败可以控制台查看相关信息'
        });
      } else {
        const markdown = craft.markdown.craftBlockToMarkdown([result.data], 'common', {
          tableSupported: true,
        })
        console.log('markdown:', markdown);
      }
    })();
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
      {showTips && (
        <Row>
          <Col span={24}>
            <Alert
              message="说明"
              description="请确保页面第一个 block 是一个含有页面 meta 信息的 block"
              type="info"
              action={
                <Button size="small" danger onClick={() => {
                  craft.editorApi.openURL('http://github.com/')
                }}>
                  详情
                </Button>
              }
            />
          </Col>
        </Row>
      )
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
                  configList.map((config, i) => <Option key={i} value={(config as any).config}>{(config as any).config}</Option>)
                }
              </Select>
            </Form.Item>
            <Form.Item
              dependencies={['config']}
            >
              {({ getFieldValue }) =>
                <>
                  <Form.Item name="name" label="配置名" rules={[{ required: true }]}>
                    <Input placeholder={'配置项的名字？'} />
                  </Form.Item>
                  <Form.Item name="github_token" label="Github Token" rules={[{ required: true }]}>
                    <Input placeholder={'Github Personal Token'} />
                  </Form.Item>
                  <Form.Item name="url" label="url" rules={[{ required: true }]}>
                    <Input placeholder={'其他'}  />
                  </Form.Item>
                  <Form.Item {...tailLayout}>
                    <Button type="primary" htmlType="submit" style={{margin: '0 8px'}}>
                      确认并同步
                    </Button>
                    {
                      Boolean(form.getFieldValue('config')) ? <Button htmlType="button" onClick={onDelete}>
                        删除配置
                      </Button> : <Button htmlType="button" onClick={onReset}>
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
  ReactDOM.render(<App />, document.getElementById('react-root'))
}
