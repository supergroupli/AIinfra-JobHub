# 维护公开目录

## 收录流程

1. 收到公开 Issue 后，检查提交者是否有权代表该机会；开发者名片只接受本人提交。核对所填 GitHub 账号与发帖账号。
2. 检查公开展示同意、技术方向、官方链接、工作地区和语言。机会需要报酬范围、币种和周期；志愿协作必须标明无薪。要求含糊时先补充。
3. 不收录私密简历、证件、住址、密钥或客户材料。若 Issue 已有敏感信息，先协助作者编辑/删除，并按 GitHub 流程处理历史；不要复制进 Git。
4. 维护者将同意展示的最少字段整理到 `content/jobs.json` 或 `content/people.json`，用 `source` 链接原 Issue，设置最近确认日期和截止日期。推荐 30 天，最多 90 天。
5. 通过 Pull Request 复核资料与中英摘要，运行校验，合并到 `main` 后自动构建。
6. 在原 Issue 中记录收录状态。该交流由维护者按社区流程处理，建站代码不会代替任何人自动发消息。

浏览器会根据当前 UTC 日期隐藏已到期记录，构建也会移除过期记录。到期不等于原 Issue 自动关闭，原始 Git 数据也不会自动消失。初版没有自动催更或自动验证雇主。

## 数据格式

以下仅为结构示例，**不要将示例直接发布为真实职位**。把 `source` 改为本仓库内真实的提交 Issue，其他字段必须来自真实提交。

```json
{
  "id": "company-role-issue-123",
  "status": "approved",
  "consent": true,
  "title": "Inference Engineer",
  "company": "Actual submitter's company",
  "summary": {"zh": "经提交人确认的中文工作摘要", "en": "An accurate English summary"},
  "tags": ["vLLM", "Serving"],
  "workMode": "remote-regional",
  "location": "Eligible regions, not just Remote",
  "eligibility": "Employment/work authorization constraints and sponsorship",
  "languages": "English, Mandarin",
  "availability": "Expected timezone overlap and hours",
  "seniority": "Concrete experience expectations",
  "kind": "full-time",
  "compensation": "Actual range, currency and period",
  "applyUrl": "https://company.example/careers/real-role",
  "source": "https://github.com/OWNER/REPO/issues/123",
  "updatedAt": "2026-11-13",
  "expiresAt": "2026-12-13"
}
```

名片的共同字段与职位相同：`id`、`status`、`consent`、`summary`、`tags`、`workMode`、`location`、`languages`、`availability`、`source`、`updatedAt`、`expiresAt`。
不用职位的 `title`、`company`、`eligibility`、`seniority`、`kind`、`compensation`、`applyUrl`，改用：

```json
{
  "name": "本人选择的公开名称或昵称",
  "github": "https://github.com/ACTUAL-USER",
  "portfolio": "https://actual-public-portfolio.example/project"
}
```

字段约束：

- `status`：`approved`、`pending` 或 `withdrawn`；只有 `approved` 且未过期会进静态页面数据。
- `consent`：必须是布尔值 `true`，维护者须先检查原始同意；填写这个字段不自动证明已取得同意。
- `tags`：Serving、KV Cache、vLLM、SGLang、LMCache、CUDA、Triton、Kubernetes、Distributed Systems。
- `workMode`：`remote-global`、`remote-regional`、`hybrid`、`onsite`。全球远程必须与实际雇佣范围一致。
- `kind`：`full-time`、`internship`、`contract`、`research`、`open-source`。
- `source`：本仓库 `https://github.com/OWNER/REPO/issues/NUMBER`。
- 日期格式 `YYYY-MM-DD`，最近确认日期不能在未来，过期日期为确认后 1–90 天。
- URL 必须 HTTPS，不得含账号密码；原始内容会按文本转义展示，不执行提交者 HTML。
- 本地有记录后，构建需在 `site.config.json` 设置正确的 `OWNER/REPO`；Actions 自动读取。

公开 JSON 源文件本身也是公开的。不要把还没取得公开同意的资料放进 `pending` 记录。

## 更新与撤回

作者更新原 Issue 并提出请求 → 维护者修改或删除对应 JSON 记录 → 合并并重新发布 → 确认当前网站已更新。

撤回时直接删除记录。`withdrawn` 适合不含私密信息的停用记录，但不等于删除历史。
Git 历史、Actions 旧产物、旧部署、clone、fork 和搜索缓存可能保存已公开内容；网站移除不是全面抹除。
涉及个人敏感资料时，进一步按 GitHub 官方文档处理 Git 历史及支持请求。

## 学习内容维护

保留官方来源；修改实验路径时说明核对日期和测试版本。所有性能结论附环境、工作负载、原始记录与限制。
不要复制整套上游文档，不编造就业结果，也不以自动勾选给开发者颁发能力认证。
