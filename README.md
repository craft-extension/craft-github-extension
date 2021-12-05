# 用途

将当前 Craft 文档内容同步到目标 Github 仓库

# 开发

1. npm i
2. npm start

# 打包

`npm run build` 后，dist 目录中的 craft-github-extension 即是插件

# 原理

在当页加载该插件，获取插件的 markdown 格式的文本后，通过 github api 将内容同步到指定的 github 仓库

# 开发计划

[] 完成主要同步逻辑
[] 处理图片，允许图片存储到另一个单独的 github 仓库中
[] 支持

# 注意事项

1. Github Pages 基于 Jekyll，其他博客类型陆续支持中
2. 由于 github api 限制，你只能上传小于 1M 的文本内容或者图片到 github 仓库中。
3. 请确保页面的第一个元素为 table，否则无法同步，该插件读取第一个 table 元素，来作为文章的 [Front Meta](https://jekyllrb.com/docs/front-matter/) 信息

