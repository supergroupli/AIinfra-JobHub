# 从零认识 AI 推理 · 离线实验

完整解压 ZIP，用浏览器打开同一文件夹里的 `index.html`。配套的 `activities.js` 和 `lab.css` 请放在它旁边。页面的 English 按钮可在中英文之间切换。三组实验在本机运行，刷新可回到初始条件。

1. **续写一句话。** 开头选「我」，点击发送。四个样句中有三个在「我」后接「喜欢」。再点一次，得到「我喜欢苹果」。把开头改成「我喜欢」，用加入两句「我喜欢梨。」后的样文重新训练，再发送，比较梨和苹果的出现次数。
2. **把文本切成块。** 比较词表 A 和词表 B。记下「苹果汁」在两张表里的编号，再用编号查回文本。英语例子里第二块 “ juice” 的开头保留了一个空格。
3. **给一次请求计时。** 先设前面 0 人、回答 3 块，记录看到第一块与完整回答的时间。保持回答长度，把前面人数改为 2，再记录两次时间。把自己的条件和观察抄到课程第 10 节的实验卡里。

前三步只用浏览器。第一组用样句统计相邻文本块，第二组使用练习词表，第三组使用约定的教学秒数。

## Inference primer · offline labs

Extract the ZIP fully and open `index.html` in a browser. Keep `activities.js` and `lab.css` beside it. Use the language button to switch between English and Chinese. All three experiments run on your device. Reload the workbook to start fresh.

1. **Generate a sentence.** Start with “I” and press Send. Three of the four examples place “like” after “I”. Press the next-piece button to get “I like apples”. Choose “I like”, train with two extra “I like pears.” examples and send again. Compare the counts for apples and pears.
2. **Split text into pieces.** Compare vocabularies A and B. Record the IDs for “apple juice” and reconstruct the text by looking up each ID. Keep the leading space in the second piece “ juice”.
3. **Time a request.** Start with 0 people ahead and a 3-piece answer. Record when you see the first piece and the whole answer. Change only the queue to 2 people. Record the times again and write the conditions and observations on the experiment card in lesson 10.

The first lab uses counts of adjacent pieces in example sentences. The second uses two small teaching vocabularies. Timing in the third follows the stated classroom assumptions.

### 选做 · 第一次运行 Python

已经有 Python 3 的同学可以在解压后的文件夹内运行同一个计时实验。Windows 在文件资源管理器打开含 `lab.py` 的文件夹，在地址栏输入 `cmd` 后按回车。macOS 或 Linux 可以打开终端，键入 `cd` 和一个空格，把解压后的文件夹拖进窗口，再按回车。

- Windows 终端运行 `py -3 lab.py --ahead 2 --pieces 3`。
- macOS 或 Linux 终端运行 `python3 lab.py --ahead 2 --pieces 3`。
- 应看到 `first=5 s, full=7 s`。只把最后的 `3` 改为 `5` 并再次运行，得到 `first=5 s, full=9 s`。

如果电脑提示找不到命令，先在 `index.html` 的排队实验做完相同对照。想安装 Python 时可以查阅 [Python 初学者指南](https://www.python.org/about/gettingstarted/)。

### Optional · Run your first Python script

With Python 3 installed, open a terminal in the extracted folder containing `lab.py`. On Windows, open the folder in File Explorer, type `cmd` into its address bar and press Enter. On macOS or Linux, type `cd` and a space in a terminal, drag the folder into the window and press Enter.

Run `py -3 lab.py --ahead 2 --pieces 3` on Windows or `python3 lab.py --ahead 2 --pieces 3` on macOS or Linux. The output is `first=5 s, full=7 s`. Change just the last number to `5` and run it again. The output becomes `first=5 s, full=9 s`. If the command is unavailable, open `index.html` to compare the same two cases. For installation help, see [Python for beginners](https://www.python.org/about/gettingstarted/).
