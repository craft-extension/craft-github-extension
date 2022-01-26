import * as auth from './tencent-cos/auth';
import xml2json from './tencent-cos/lib/xml2json'
import {message} from 'antd';

import error from './error';

export const baseUrl = 'https://blog-static-1254272402.cos.ap-beijing.myqcloud.com';

export const secret = {};

export const setSecret = (form) => {
    secret.SecretId = form.getFieldValue('tencent_cos_secret_id').trim();
    secret.SecretKey = form.getFieldValue('tencent_cos_secret_key').trim();
};

export const getFileList = (query) => {
    if (!secret.SecretKey || !secret.SecretKey) {
        console.log('getFileList: 请先调用 getSecret 进行配置！');
        return;
    };
    console.log('query:', query);

    return craft.httpProxy.fetch({
        url: `${baseUrl}?${auth.obj2str(query)}`,
        method: 'GET',
        headers: {
            Authorization: auth.getAuthorization({
                ...secret,
                Method: 'GET',
                Pathname: '/',
                Query: query
            }),
        }
    }).then(data => {
        if (data.status !== 'success') {
            message.error(error.getCOSFileList.fetchNotSuccess);
            console.log(`${error.getCOSFileList.fetchNotSuccess}:${data}`);
            return;
        }
        return data.data.body.text().then(xml => {
            const result = xml2json(xml);
            // Note: 如果只有一个值的时候，xml2json 是对象
            if (Array.isArray(result?.ListBucketResult?.Contents)) {
                return result?.ListBucketResult?.Contents?.map(file => file.Key);
            }
            // FIXME: 忽略所有异常
            return [result?.ListBucketResult?.Contents?.Key];
        });
    }).catch(err => {
        console.log(`${error.getCOSFileList.fetchError}:${err}`);
    });
};

export const getCraftImages = (files) => {
    return Promise.all(files.map(({url, name}) => {
        return craft.httpProxy.fetch({
            url: url,
            method: 'GET',
        }).then(blob => {
            return {
                blob,
                name,
                suffix: name.split('.')[1],
            };
        });
    })).catch(err => {
        console.log('下载文件 列表错误:', err);
    });
}

// Note: files = {name, blob};
export const uploadFiles = (files) => {
    // Note: 使用 PUT 方法，因为 POST 还有自己的一套额外鉴权方式，麻烦
    return Promise.all(files).then(fileList => {
        return fileList.map(file => {
            console.log('准备上传:', file);
            return craft.httpProxy.fetch({
                url: `${baseUrl}/${file.name}`,
                method: 'PUT',
                headers: {
                    Authorization: auth.getAuthorization({
                        ...secret,
                        Method: 'PUT',
                        Pathname: `/${file.name}`,
                        Headers: {
                            // Note: 指定文件类型
                            'Content-Type': `image/${file.name.split('.')[1]}`
                        }
                    }),
                    // Note: 指定上传文件的类型，因为是 blob 所以是这个
                    'Content-Type': `image/${file.name.split('.')[1]}`

                },
                body: file.blob,
            });
        });
    }).catch(err => {
        console.log('图片上传失败:', err);
    });
};

export const deleteFiles = ({
    files,
}) => {
    // TODO: 直接执行删除 COS 文件的操作即可
};
