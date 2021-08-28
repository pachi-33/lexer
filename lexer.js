// 词法分析器
let lexer = {

    // 输入流读取器 Input Stream Reader
    ISR: {
        props: {
            stream: "", // 字符流
            length: 0, // 字符流的长度
            seq: 0, // 字符流的序号
        },
        propsChange: {
            incrSeq() {
                lexer.ISR.props.seq++;
            },
            toDefault() {
                lexer.ISR.props.stream = '';
                lexer.ISR.props.length = 0;
                lexer.ISR.props.seq = 0;
            },
        },

        before(stream) {
            // 确定字符流
            lexer.ISR.props.stream = stream;

            // 换行符替换为空格
            lexer.ISR.props.stream = lexer.ISR.props.stream.replace(/\n/g, " ").trim();

            // 多个空格替换为1个空格
            lexer.ISR.props.stream = lexer.ISR.props.stream.replace(/\s+/g, " ").trim();

            // 计算字符流长度和序号
            lexer.ISR.props.length = lexer.ISR.props.stream.length;
            lexer.ISR.props.seq = 0;
        },
        after() {
            lexer.DFA.resultChange.filter();
        },
        nextChar() {
            let seq = lexer.ISR.props.seq;
            if (seq <= lexer.ISR.props.length - 1) {
                return lexer.ISR.props.stream[seq];
            }
            return undefined;
        },
        isLastChar() {
            return lexer.ISR.props.seq === lexer.ISR.props.length - 1;
        },
        read() {
            let ch = '';
            while (!tool.isUndefined(ch = lexer.ISR.nextChar())) {
                let match = false;
                let end = false;

                let nextState = flowModel.getNextState(ch, lexer.DFA.state);
                if (nextState !== DFA_STATE_CONST.S_RESET) {
                    match = true;
                    if (lexer.ISR.isLastChar()) {
                        end = true;
                    }
                }

                if (match) {
                    lexer.ISR.propsChange.incrSeq();
                    lexer.DFA.events.flowtoNextState(ch, nextState);
                    if (end) {
                        lexer.DFA.resultChange.produceToken();
                    }
                } else {
                    lexer.DFA.resultChange.produceToken();
                    lexer.DFA.events.flowtoResetState();
                }
            }
        },
    },

    // 有限状态自动机 deterministic finite automaton
    DFA: {
        result: {
            queue: [], // 待组成token的字符队列
            tokens: [],
        },
        resultChange: {
            toDefault() {
                lexer.DFA.result.queue = [];
                lexer.DFA.result.tokens = [];
            },
            pushToTokens(token) {
                lexer.DFA.result.tokens.push(token);
                lexer.DFA.result.queue = [];
            },
            pushToQueue(ch) {
                lexer.DFA.result.queue.push(ch);
            },
            filter() {
                let tokens = [];
                lexer.DFA.result.tokens.forEach((token => {
                    if (token.value !== ENUM_CONST.WHITESPACE) {
                        tokens.push(token);
                    }
                }));
                lexer.DFA.result.tokens = tokens;
            },
            produceToken() {
                if (lexer.DFA.result.queue.length) {
                    let value = lexer.DFA.result.queue.join('');
                    let type = tool.judgeTokenType(lexer.DFA.state, value);
                    let token = {
                        "type": type,
                        "value": value,
                    };
                    lexer.DFA.resultChange.pushToTokens(token);
                }
            },
        },

        state: DFA_STATE_CONST.S_RESET, // 当前机器的状态
        events: {
            flowtoNextState(ch, state) {
                lexer.DFA.resultChange.pushToQueue(ch);
                lexer.DFA.state = state;
            },

            flowtoEndState(ch) {
                lexer.DFA.resultChange.pushToQueue(ch);
                lexer.DFA.state = DFA_STATE_CONST.S_END;
            },

            flowtoResetState() {
                lexer.DFA.state = DFA_STATE_CONST.S_RESET;
            },
        },
    },

    // 重置词法分析器数据
    resetDefault() {
        lexer.ISR.propsChange.toDefault();
        lexer.DFA.resultChange.toDefault();
    },

    // 开始工作
    start(stream) {
        lexer.resetDefault();
        lexer.ISR.before(stream);
        lexer.ISR.read();
        lexer.ISR.after();
    },
};