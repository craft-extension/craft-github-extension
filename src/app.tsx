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
  message,
} from 'antd';

import { Octokit } from "octokit";

interface Config {
  config: string;
  name: string;
  github_token: string;
  github_owner: string;
  github_repo: string;
  github_branch: string;
  github_path: string;
  github_message: string;
};

const { Option } = Select;

const layout = {
  labelCol: { span: 8 },
  wrapperCol: { span: 16 },
};
const tailLayout = {
  wrapperCol: { span: 24 },
};

const DEFAULT_CONFIG = {
  config: '',
  name: '',
  github_token: '',
  github_owner: '',
  github_repo: '',
  github_branch: 'main',
  github_path: '',
  github_message: '',
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
        // Note: 第一个是 table，构建后发送
        const data = result.data.subblocks;
        const title = result.data.content[0].text + '\n'; // Note: 标题作为博客文章名
        const markdown = craft.markdown.craftBlockToMarkdown(result.data.subblocks.slice(1), 'bear', {
          tableSupported: true,
        })
        const metaTable = data.slice(0, 1)[0];
        if (metaTable.type !== 'tableBlock') {
          message.error('第一个元素请设置为 table 来设置 meta 信息');
          return;
        }
        let metaMarkdown = '---\n';
        metaMarkdown += `title: ${title}`
        metaTable.rows.forEach((row) => {
          const left = (row.cells[0].block as any).content[0].text;
          const right = (row.cells[1].block as any).content[0].text;
          const isMultiLine: string[] = right.split('-:');
          if (isMultiLine.length > 1) {
            metaMarkdown += `${left}:\n`;
            isMultiLine.filter(Boolean).forEach(tag => {
              metaMarkdown += `    - ${tag}\n`;
            });
          } else {
            metaMarkdown += `${(row.cells[0].block as any).content[0].text}: ${(row.cells[1].block as any).content[0].text}\n`;
          }
        });
        metaMarkdown += '---\n\n';
        // Note: 此处获取到 markdown，加上所有配置也齐全了，可以开始同步了
        // TODO: 需要先发送获取该文件的请求，以检查该文件是否存在，如果存在，则需要提供该文件的 sha（在返回的结果中有该值）
        //  如果不存在则不需要该值
        const octokit = new Octokit({auth: form.getFieldValue('github_token')});
        // Note: 先获取该地址，如果不存在则新建，如果存在则需要拿到该文件的 sha 值进行更新
        const owner = form.getFieldValue('github_owner');
        const repo = form.getFieldValue('github_repo');
        const path = form.getFieldValue('github_path');
        const branch = form.getFieldValue('github_branch') || 'main';
        const git_message = form.getFieldValue('github_message');
        const content = btoa(unescape(encodeURIComponent(metaMarkdown + markdown)));
        octokit.rest.repos.getContent({
          owner,
          repo,
          path,
        }).then((res) => {
          // Note: 更新
          if ([200, 201].includes(res.status)) {
            message.error('文件存在，更新中...');
            octokit.rest.repos.createOrUpdateFileContents({
              owner,
              repo,
              branch,
              path,
              message: git_message,
              sha: (res.data as any).sha,
              content,
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
        }).catch((err) => {
          if (err.status === 404) {
            message.error('文件不存在，新建中...', err);
            octokit.rest.repos.createOrUpdateFileContents({
              owner,
              repo,
              branch,
              path,
              message: git_message,
              content,
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
              description="使用说明点击详情查看"
              type="info"
              action={
                <Button size="small" danger onClick={() => {
                  craft.editorApi.openURL('https://www.xheldon.com/callout/use-craft-extension-to-write-blog.html')
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
                  <Form.Item
                    name="github_token"
                    label="Github Token"
                    rules={[{ required: true }]}
                    tooltip={
                      <span>Github 的 <a href="" onClick={() => {craft.editorApi.openURL('https://github.com/settings/tokens/new');}}>Personal Token</a></span>
                    }>
                      <Input.Password placeholder={'Github Personal Token'} />
                  </Form.Item>
                  <Form.Item name="github_owner" label="owner" rules={[{ required: true }]} tooltip={'Github 的用户名，如 "Xheldoon"'}>
                    <Input placeholder={'用户名'}  />
                  </Form.Item>
                  <Form.Item name="github_repo" label="repo" rules={[{ required: true }]} tooltip={'Github 的仓库地址，只需要名字即可，如 "x_blog_src"'}>
                    <Input placeholder={'仓库名'}  />
                  </Form.Item>
                  <Form.Item name="github_branch" label="branch" tooltip={'当前文档要上传到仓库的分支，默认是 "main"'}>
                    <Input placeholder={'分支名'}  />
                  </Form.Item>
                  <Form.Item name="github_path" label="path" rules={[{ required: true }]} tooltip={'文件所在的路径，如 "_post/tech/readme.md" 本插件只支持文件'}>
                    <Input placeholder={'文件路径'}  />
                  </Form.Item>
                  <Form.Item name="github_message" label="message" rules={[{ required: true }]} tooltip={'提交信息，如 "由 Craft github 插件添加"'}>
                    <Input placeholder={'提交信息'}  />
                  </Form.Item>
                  <Form.Item {...tailLayout}>
                    <Button type="primary" htmlType="button" style={{margin: '0 8px'}} onClick={onFinish}>
                      确认并同步
                    </Button>
                    {
                      Boolean(getFieldValue('config')) ? <Button htmlType="button" onClick={onDelete}>
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
