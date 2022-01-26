const crypto = require('crypto-browserify');

const token = {};

module.exports = {
    // 获取随机数
    getRandom: function(min, max) {
        return Math.round(Math.random() * (max - min) + min);
    },
    // 对象转query string
    json2str: function (obj) {
        let arr = [];
        Object.keys(obj).sort().forEach(key=>{
            let value = obj[key] || '';
            arr.push(key + '=' + value);
        });
        return arr.join('&');
    },
    // JS的encodeURIComponent方法和其他语言的encode表现不一致，比如encodeURIComponent('*')的结果是'*',而PHP里urlencode('*')的结果是'%2A'
    safeUrlEncode(str) {
        return encodeURIComponent(str)
            .replace(/!/g, '%21')
            .replace(/'/g, '%27')
            .replace(/\(/g, '%28')
            .replace(/\)/g, '%29')
            .replace(/\*/g, '%2A');
    },
    // 获取对象键值并按小写后的首字母排序
    getObjectKeys(obj){
        return Object.keys(obj).sort((a, b)=>{
            a = a.toLowerCase();
            b = b.toLowerCase();
            return a === b ? 0 : (a > b ? 1 : -1);
        });
    },
    // 对象转query string + urlEncode
    obj2str(obj){
        let key, val;
        let list = [];
        let keyList = this.getObjectKeys(obj);
        for (let i = 0; i < keyList.length; i++) {
            key = keyList[i];
            val = (obj[key] === undefined || obj[key] === null) ? '' : ('' + obj[key]);
            key = ('' + key).toLowerCase();
            key = this.safeUrlEncode(key);
            val = this.safeUrlEncode(val) || '';
            list.push(key + '=' +  val);
        }
        return list.join('&');
    },
    // 简答的深拷贝
    clone(obj) {
        function map(obj, fn) {
            let o = obj instanceof Array ? [] : {};
            for (let i in obj) {
                if (obj.hasOwnProperty(i)) {
                    o[i] = fn(obj[i]);
                }
            }
            return o;
        }
        return map(obj, function(value) {
            return typeof value === 'object' ? this.clone(value) : value;
        });
    },
    // 计算授权签名
    getAuthorization(opt){
        // if (token.timestamp) {
        //     // Note: 如果已经创建过 Auth 且未过期，则直接用，否则才创建新的 token
        //     //  token 有效期是 60 分钟，给每个 token 30 分钟的操作时间足够了
        //     if (token.timestamp - Date.now() < 1000 * 1800) {
        //         return token.auth;
        //     }
        // }
        let SecretId = opt.SecretId;
        let SecretKey = opt.SecretKey;
        let method = opt.Method.toLowerCase();
        let pathname = opt.Pathname.indexOf('/') === 0 ? opt.Pathname : '/' + opt.Pathname;
        let query = this.clone(opt.Query || {});
        let headers = this.clone(opt.Headers || {});
        console.log('getAuth:', pathname, query, headers);
        // 签名有效起止时间
        let now = parseInt(new Date().getTime() / 1000) - 1;
        let exp = now + 3600; // 签名过期时间为当前 + 900s;

        // 要用到的 Authorization 参数列表
        let qSignAlgorithm = 'sha1';
        let qAk = SecretId;
        let qSignTime = now + ';' + exp;
        let qKeyTime = now + ';' + exp;
        let qUrlParamList = this.getObjectKeys(query).join(';').toLowerCase();
        let qHeaderList = this.getObjectKeys(headers).join(';').toLowerCase();
        console.log('getAuth22:', qSignTime, qKeyTime, qUrlParamList, qHeaderList);
        // 签名算法说明文档：https://www.qcloud.com/document/product/436/7778

        // 步骤一：计算 SignKey
        let signKey = crypto.createHmac('sha1', SecretKey).update(qKeyTime).digest('hex');
        console.log('signKey:', signKey);
        // 步骤二：构成 FormatString
        let formatString = [method, pathname, this.obj2str(query), this.obj2str(headers), ''].join('\n');
        console.log('formatString1:', formatString);
        formatString = Buffer.from(formatString, 'utf8');
        console.log('formatString2:', formatString);
        // 步骤三：计算 StringToSign
        let sign = crypto.createHash('sha1').update(formatString).digest('hex');
        let stringToSign = ['sha1', qSignTime, sign, ''].join('\n');
        console.log('stringToSign:', stringToSign)
        // 步骤四：计算 Signature
        let qSignature = crypto.createHmac('sha1', signKey).update(stringToSign).digest('hex');
        console.log('qSingnature:', qSignature);
        // 步骤五：构造 Authorization
        token.timestamp = Date.now();
        return token.auth = [
            'q-sign-algorithm=' + qSignAlgorithm,
            'q-ak=' + qAk,
            'q-sign-time=' + qSignTime,
            'q-key-time=' + qKeyTime,
            'q-header-list=' + qHeaderList,
            'q-url-param-list=' + qUrlParamList,
            'q-signature=' + qSignature
        ].join('&');
    }
};