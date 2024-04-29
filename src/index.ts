import ftWebsocket from "../src/main.js";
import { ftCmdID } from "../src/main.js";
import pkg from "../src/proto.js";
import beautify from "js-beautify";
import crypto from "crypto";

const { Common, Qot_Common, Trd_Common } = pkg as any;
const { SubType, QotMarket, RehabType, KLType } = Qot_Common
const { SecurityFirm, TrdEnv, TrdMarket, OrderType, TrdSecMarket, TrdSide, ModifyOrderOp } = Trd_Common
const { RetType } = Common

export class Futu {

    websocket: ftWebsocket
    isLogin: boolean = false
    tradeSerialNo = 0;
    trdMarket:number = TrdMarket.TrdMarket_HK
    trdEnv:number = 1
    accID:string = ''

    constructor() {
        let [addr, port, enable_ssl, key] = ["127.0.0.1", 33333, false, '7522027ccf5a06b1'];
        this.websocket = new ftWebsocket();

        this.websocket.onlogin = (ret, msg) => {
            if (ret) { // 登录成功
                this.isLogin = true
            } else {
                console.info("登录失败：", msg);
            }
        };

        this.websocket.onPush = (cmd, res) => {
            if (ftCmdID.QotUpdateOrderBook.cmd == cmd) { // 摆盘推送的处理逻辑
                let { retType, s2c } = res
                if (retType == RetType.RetType_Succeed) {
                    console.log("OrderBookTest", s2c);
                } else {
                    console.log("OrderBookTest: error")
                }
            }

            if(ftCmdID.TrdUpdateOrderFill.cmd == cmd){ // 成交通知推送的处理逻辑
                let { retType, s2c } = res
                if(retType == RetType.RetType_Succeed){
                    let data = beautify(JSON.stringify(s2c), {
                        indent_size: 2,
                        space_in_empty_paren: true,
                    });
                    console.log("TrdUpdateOrderFill:");
                    console.log(data);
                } else {
                    console.log("TrdUpdateOrderFillTest: error")
                }
            } 
            
            if(ftCmdID.TrdUpdateOrder.cmd == cmd){ // 订单状态变动通知推送的处理逻辑
                let { retType, s2c } = res
                if(retType == RetType.RetType_Succeed){
                    let data = beautify(JSON.stringify(s2c), {
                        indent_size: 2,
                        space_in_empty_paren: true,
                    });
                    console.log("TrdUpdateOrder:");
                    console.log(data);
                } else {
                    console.log("TrdUpdateOrderTest: error")
                }
            }
        };

        this.websocket.start(addr, port, enable_ssl, key);

        //关闭行情连接，连接不再使用之后，要关闭，否则占用不必要资源
        //同时OpenD也限制了最多128条连接
        //也可以一个页面或者一个项目维护一条连接，这里范例请求一次创建一条连接
        // setTimeout(() => {
        //     this.websocket.stop();
        //     console.log("stop");
        // }, 5000); 
    }

    SetAcc(accID:string, trdEnv:number = 1) {
        this.accID = accID
        this.trdEnv = trdEnv
    }

    SetTrdMarket(trdMarket:number){
        this.trdMarket = trdMarket
    }

    /**
     * 订阅实时行情
     * @param code 股票代码
     * @param market 市场
     * @param subTypeList 订阅实时报价类型
     * @returns 返回股票快照
     */
    async Sub(code: string, market: number = QotMarket.QotMarket_HK_Security, subTypeList: number[] = [SubType.SubType_Basic]) {
        try {
            const res = await this.websocket.Sub({
                c2s: {
                    securityList: [
                        {
                            market,
                            code,
                        },
                    ],
                    subTypeList, // 订阅实时报价类型
                    isSubOrUnSub:true, // 订阅 true, 反订阅 false
                    isRegOrUnRegPush: true, // 注册推送 true, 反注册推送 false
                },
            })

            return res

        } catch (error: any) {
            if ("retMsg" in error) {
                console.error("Sub error:", error.retMsg);
            }
            return error
        };
    }

    /**
     * 反订阅实时行情
     * @param code 股票代码
     * @param market 市场
     * @param subTypeList 订阅实时报价类型
     * @returns 返回股票快照
     */
    async UnSub(code: string, market: number = QotMarket.QotMarket_HK_Security, subTypeList: number[] = [SubType.SubType_Basic]) {
        try {
            const res = await this.websocket.Sub({
                c2s: {
                    securityList: [
                        {
                            market,
                            code,
                        },
                    ],
                    subTypeList, // 订阅实时报价类型
                    isSubOrUnSub: false, // 订阅 true, 反订阅 false
                    isRegOrUnRegPush: false, // 注册推送 true, 反注册推送 false
                },
            })

            return res

        } catch (error: any) {
            if ("retMsg" in error) {
                console.error("Sub error:", error.retMsg);
            }
            return error
        };
    }

    /**
    * 获取订阅状态
    * @returns 返回全部订阅状态
    */
    async GetSubInfo() {
        try {
            const req = {
                c2s: {
                    isReqAllConn: true,
                },
            }; // 获取订阅状态参数

            const res = await this.websocket.GetSubInfo(req)
            let { errCode, retMsg, retType, s2c } = res
            if (retType == RetType.RetType_Succeed) {
                console.log("GetSubInfo: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
                console.log("GetSubInfo:", JSON.stringify(s2c));
            } else {
                console.log("GetSubInfo: error")
            }

        } catch (error: any) {
            console.log(error)
            if ("retMsg" in error) {
                console.log("error:", error.retMsg);
            }
        }
    }

    /**
     * 实时报价回调
     * @param code 股票代码
     * @param market 市场
     * @returns 返回股票快照
     */
    async UpdateBasicQot(code: string, market: number = QotMarket.QotMarket_HK_Security) {
        const req = {
            c2s: {
                securityList: [
                    {
                        market,
                        code,
                    },
                ],
                subTypeList: [SubType.SubType_Basic], // 订阅实时报价类型
                isSubOrUnSub: true, // 订阅 true, 反订阅 false
                isRegOrUnRegPush: true, // 注册推送 true, 反注册推送 false
            },
        }; // 订阅参数

        this.websocket.Sub(req) //# 订阅, OpenD 开始持续收到服务器的推送
            .then((res) => { })
            .catch((error) => {
                if ("retMsg" in error) {
                    console.log("error:", error.retMsg);
                }
            });
    }

    /**
     * 实时摆盘回调
     * @param code 股票代码
     * @param market 市场
     * @returns 返回股票快照
     */
    async UpdateOrderBook(code: string, market: number = QotMarket.QotMarket_HK_Security) {
        const req = {
            c2s: {
                securityList: [
                    {
                        market,
                        code,
                    },
                ],
                subTypeList: [SubType.SubType_OrderBook], // 订阅实时报价类型
                isSubOrUnSub: true, // 订阅 true, 反订阅 false
                isRegOrUnRegPush: true, // 注册推送 true, 反注册推送 false
            },
        }; // 订阅参数

        this.websocket.Sub(req) //# 订阅, OpenD 开始持续收到服务器的推送
            .then((res) => { })
            .catch((error) => {
                if ("retMsg" in error) {
                    console.log("error:", error.retMsg);
                }
            });
    }

    /**
     * 实时K线回调
     * @param code 股票代码
     * @param market 市场
     * @returns 返回股票快照
     */
    async UpdateKL(code: string, market: number = QotMarket.QotMarket_HK_Security, kl: string = SubType.SubType_KL_1Min) {
        const req = {
            c2s: {
                securityList: [
                    {
                        market,
                        code,
                    },
                ],
                subTypeList: [kl], // 订阅实时报价类型
                isSubOrUnSub: true, // 订阅 true, 反订阅 false
                isRegOrUnRegPush: true, // 注册推送 true, 反注册推送 false
            },
        }; // 订阅参数

        this.websocket.Sub(req) //# 订阅, OpenD 开始持续收到服务器的推送
            .then((res) => { })
            .catch((error) => {
                if ("retMsg" in error) {
                    console.log("error:", error.retMsg);
                }
            });
    }

    /**
     * 实时分时回调
     * @param code 股票代码
     * @param market 市场
     * @returns 返回股票快照
     */
    async UpdateRT(code: string, market: number = QotMarket.QotMarket_HK_Security) {
        const req = {
            c2s: {
                securityList: [
                    {
                        market,
                        code,
                    },
                ],
                subTypeList: [SubType.SubType_RT], // 订阅实时报价类型
                isSubOrUnSub: true, // 订阅 true, 反订阅 false
                isRegOrUnRegPush: true, // 注册推送 true, 反注册推送 false
            },
        }; // 订阅参数

        this.websocket.Sub(req) //# 订阅, OpenD 开始持续收到服务器的推送
            .then((res) => { })
            .catch((error) => {
                if ("retMsg" in error) {
                    console.log("error:", error.retMsg);
                }
            });
    }

    /**
     * 实时逐笔回调
     * @param code 股票代码
     * @param market 市场
     * @returns 返回股票快照
     */
    async UpdateTicker(code: string, market: number = QotMarket.QotMarket_HK_Security) {
        const req = {
            c2s: {
                securityList: [
                    {
                        market,
                        code,
                    },
                ],
                subTypeList: [SubType.SubType_Ticker], // 订阅实时报价类型
                isSubOrUnSub: true, // 订阅 true, 反订阅 false
                isRegOrUnRegPush: true, // 注册推送 true, 反注册推送 false
            },
        }; // 订阅参数

        this.websocket.Sub(req) //# 订阅, OpenD 开始持续收到服务器的推送
            .then((res) => { })
            .catch((error) => {
                if ("retMsg" in error) {
                    console.log("error:", error.retMsg);
                }
            });
    }

    /**
     * 实时经纪队列回调
     * @param code 股票代码
     * @param market 市场
     * @returns 返回股票快照
     */
    async UpdateBroker(code: string, market: number = QotMarket.QotMarket_HK_Security) {
        const req = {
            c2s: {
                securityList: [
                    {
                        market,
                        code,
                    },
                ],
                subTypeList: [SubType.SubType_Broker], // 订阅实时报价类型
                isSubOrUnSub: true, // 订阅 true, 反订阅 false
                isRegOrUnRegPush: true, // 注册推送 true, 反注册推送 false
            },
        }; // 订阅参数

        this.websocket.Sub(req) //# 订阅, OpenD 开始持续收到服务器的推送
            .then((res) => { })
            .catch((error) => {
                if ("retMsg" in error) {
                    console.log("error:", error.retMsg);
                }
            });
    }

    /**
     * 获取快照
     * @param code 股票代码
     * @param market 市场
     * @returns 返回股票快照
     */
    async GetSecuritySnapshot(code: string, market: number = QotMarket.QotMarket_HK_Security) {
        const { RetType } = Common
        const req = {
            c2s: {
                securityList: [
                    {
                        market,
                        code,
                    },
                ],
            },
        };

        try {
            const res = await this.websocket.GetSecuritySnapshot(req)
            let { errCode, retMsg, retType, s2c } = res
            console.log("Snapshot: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let snapshot = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(snapshot);
                return snapshot
            }
            return res
        } catch (error) {
            console.log("error:", error);
            return error
        };
    }

    /**
     * 获取实时报价
     * @param code 股票代码
     * @param market 市场
     * @returns 返回股票实时报价
     */
    async GetBasicQot(code: string, market: number = QotMarket.QotMarket_HK_Security) {
        const req = {
            c2s: {
                securityList: [
                    {
                        market,
                        code,
                    },
                ],
            },
        };
        try {
            const res: any = await this.websocket.GetBasicQot(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("BasicQot: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                s2c = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.info(s2c);
                return JSON.parse(s2c)
            }
            return res
        } catch (error) {
            console.error("GetBasicQot error:", error);
            return error
        }
    }

    /**
     * 获取实时摆盘
     * @param code 股票代码
     * @param market 市场
     * @returns 返回股票实时报价
     */
    async GetOrderBook(code: string, market: number = QotMarket.QotMarket_HK_Security) {
        const req = {
            c2s: {
                security: {
                    market,
                    code,
                },
                num: 2,
            },
        };
        try {
            const res: any = await this.websocket.GetOrderBook(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("OrderBook: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

    /**
     * 获取实时 K 线
     * @param code 股票代码
     * @param market 市场
     * @returns 返回股票实时报价
     */
    async GetKL(code: string, market: number = QotMarket.QotMarket_HK_Security, kl: string = SubType.SubType_KL_1Min) {
        const req = {
            c2s: {
                rehabType: RehabType.RehabType_Forward,
                klType: kl,
                security: {
                    market,
                    code,
                },
                reqNum: 2,
            },
        };
        try {
            const res: any = await this.websocket.GetKL(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("KL: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

    /**
     * 获取实时分时
     * @param code 股票代码
     * @param market 市场
     * @returns 返回股票实时报价
     */
    async GetRT(code: string, market: number = QotMarket.QotMarket_HK_Security) {
        const req = {
            c2s: {
                security: {
                    market,
                    code,
                },
            },
        };
        try {
            const res: any = await this.websocket.GetRT(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("KL: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

    /**
     * 获取实时逐笔
     * @param code 股票代码
     * @param market 市场
     * @returns 返回股票实时报价
     */
    async GetTicker(code: string, market: number = QotMarket.QotMarket_HK_Security) {
        const req = {
            c2s: {
                security: {
                    market,
                    code,
                },
                maxRetNum: 3,
            },
        };
        try {
            const res: any = await this.websocket.GetTicker(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("KL: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

    /**
     * 获取实时经纪队列
     * @param code 股票代码
     * @param market 市场
     * @returns 返回股票实时报价
     */
    async GetBroker(code: string, market: number = QotMarket.QotMarket_HK_Security) {
        const req = {
            c2s: {
                security: {
                    market,
                    code,
                },
            },
        };
        try {
            const res: any = await this.websocket.GetBroker(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("KL: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

    /**
     * 获取交易业务账户列表
     * @returns 返回股票实时报价
     */
    async GetAccList() {
        const req = {
            c2s: {
                userID: 0,
            },
        };
        try {
            const res: any = await this.websocket.GetAccList(req)
            console.log("GetAccList:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("KL: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

    /**
     * 解锁交易
     * @param pwd 交易密码
     * @returns 返回解锁交易结果
     */
    async UnlockTrade(pwd: string) {
        // pwd的MD5值
        const pwdMD5 = crypto.createHash('md5').update(pwd).digest('hex');
        const req = {
            c2s: {
                unlock: true,
                securityFirm: SecurityFirm.SecurityFirm_FutuSecurities,
                pwdMD5, // 设置为自己账号的交易密码MD5
            },
        };
        try {
            const res: any = await this.websocket.UnlockTrade(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("KL: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

    /**
     * 解锁交易
     * @returns 返回解锁交易结果
     */
    async GetFunds() {
        const req = {
            c2s: {
                header: {
                    trdEnv:this.trdEnv,
                    accID:this.accID,
                    trdMarket:this.trdMarket,
                }
            },
        };
        try {
            const res: any = await this.websocket.GetFunds(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("KL: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

    /**
     * 查询最大可买可卖
     * @param code code
     * @param price price
     * @returns 返回解锁交易结果
     */
    async GetMaxTrdQtys(code: string, price:number, secMarket:number = TrdSecMarket.TrdSecMarket_HK) {
        const req = {
            c2s: {
                header: {
                    trdEnv: this.trdEnv,
                    accID: this.accID,
                    trdMarket:this.trdMarket,
                },
                orderType: OrderType.OrderType_Normal,
                code, // 指定账号对应市场中的代码
                price, // 价格
                secMarket,
            },
        };
        try {
            const res: any = await this.websocket.GetMaxTrdQtys(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("KL: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

    /**
     * 查询持仓
     * @returns 返回解锁交易结果
     */
    async GetPositionList() {
        const req = {
            c2s: {
                header: {
                    trdEnv: this.trdEnv,
                    accID: this.accID,
                    trdMarket:this.trdMarket,
                },
            },
        };
        try {
            const res: any = await this.websocket.GetPositionList(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("KL: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

    /**
     * 获取融资融券数据
     * @param code code
     * @returns 返回解锁交易结果
     */
    async GetMarginRatio(code:string, market:number = QotMarket.QotMarket_HK_Security) {
        const req = {
            c2s: {
                header: {
                    trdEnv: this.trdEnv,
                    accID: this.accID,
                    trdMarket:this.trdMarket,
                },
                securityList:[{
                    market,
                    code,
                },],
            },
        };
        try {
            const res: any = await this.websocket.GetMarginRatio(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("KL: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

    /**
     * 下单
     * @param code code
     * @param price price
     * @param qty qty
     * @returns 返回解锁交易结果
     */
    async PlaceOrder(code:string, price:number,qty:number) {
        const req = {
            c2s: {
                packetID:{
                    connID: this.websocket.getConnID(),
                    serialNo: this.tradeSerialNo++,
                },
                header: {
                    trdEnv: this.trdEnv,
                    accID: this.accID,
                    trdMarket: this.trdMarket,
                },
                trdSide: TrdSide.TrdSide_Buy,
                orderType: OrderType.OrderType_Normal,
                code,
                qty,
                price,
                secMarket: TrdSecMarket.TrdSecMarket_HK,
            },
        };
        try {
            const res: any = await this.websocket.PlaceOrder(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("KL: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

    /**
     * 改单撤单
     * @param orderID orderID
     * @param price price
     * @param qty qty
     * @param modifyOrderOp modifyOrderOp, 1: 修改订单, 2: 撤单
     * @returns 返回解锁交易结果
     */
    async ModifyOrder(orderID:string, price:number,qty:number, modifyOrderOp: 1|2 = ModifyOrderOp.ModifyOrderOp_Normal) {
        const req = {
            c2s: {
                packetID:{
                    connID: this.websocket.getConnID(),
                    serialNo: this.tradeSerialNo++,
                },
                header: {
                    trdEnv: this.trdEnv,
                    accID: this.accID,
                    trdMarket:this.trdMarket,
                },
                orderID: orderID,
                modifyOrderOp,
                qty,
                price,
            },
        };
        try {
            const res: any = await this.websocket.ModifyOrder(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("KL: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

    /**
     * 查询未完成订单
     * @returns 返回解锁交易结果
     */
    async GetOrderList() {
        const req = {
            c2s: {
                header: {
                    trdEnv: this.trdEnv,
                    accID: this.accID,
                    trdMarket:this.trdMarket,
                },
            },
        };
        try {
            const res: any = await this.websocket.GetOrderList(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("KL: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

    /**
     * 查询历史订单
     * @returns 返回解锁交易结果
     */
    async GetHistoryOrderList(beginTime?:string, endTime?:string) {
        // 如果没有传入时间，默认当天的订单，格式如下："2021-09-01 00:00:00"
        const date = new Date()
        if (!beginTime) beginTime = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 00:00:00`
        if (!endTime) endTime = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 23:59:59`
        const req = {
            c2s: {
                header: {
                    trdEnv: this.trdEnv,
                    accID: this.accID,
                    trdMarket:this.trdMarket,
                },
            },
            filterConditions:{
                beginTime,
                endTime,
            },
        };
        try {
            const res: any = await this.websocket.GetHistoryOrderList(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("KL: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

    /**
     * 响应订单推送回调
     * @param accIDList accIDList
     * @returns 返回解锁交易结果
     */
    async SubAccPush(accIDList){
        const req = {
            c2s: {
                accIDList ,
            },
        };

        this.websocket.SubAccPush(req)
        .then((res) => {
            let { errCode, retMsg, retType,s2c } = res
            console.log("SubAccPush: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType); 
            if(retType == RetType.RetType_Succeed){
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
            }
        })
        .catch((error) => {
            console.log("error:", error);
        });
    }

    /**
     * 查询订单费用
     * @param beginTime beginTime
     * @returns 返回解锁交易结果
     */
    async GetOrderFee(orderIdExList: string[]) {
        const req = {
            c2s: {
                header: {
                    trdEnv: this.trdEnv,
                    accID: this.accID,
                    trdMarket: this.trdMarket,
                },
                orderIdExList,
            },
        };
        try {
            const res: any = await this.websocket.GetOrderFee(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("KL: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

    /**
     * 查询当日成交
     * @returns 返回解锁交易结果
     */
    async GetOrderFillList() {
        const req = {
            c2s: {
                header: {
                    trdEnv: this.trdEnv,
                    accID: this.accID,
                    trdMarket:this.trdMarket,
                },
            },
        };
        try {
            const res: any = await this.websocket.GetOrderFillList(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("KL: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

    /**
     * 查询历史成交
     * @returns 返回解锁交易结果
     */
    async GetHistoryOrderFillList(beginTime?:string, endTime?:string) {
        // 如果没有传入时间，默认当天的订单，格式如下："2021-09-01 00:00:00"
        const date = new Date()
        if (!beginTime) beginTime = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 00:00:00`
        if (!endTime) endTime = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()} 23:59:59`
        const req = {
            c2s: {
                header: {
                    trdEnv: this.trdEnv,
                    accID: this.accID,
                    trdMarket:this.trdMarket,
                },
            },
            filterConditions:{
                beginTime,
                endTime,
            },
        };
        try {
            const res: any = await this.websocket.GetHistoryOrderFillList(req)
            console.log("res1:", res);
            let { errCode, retMsg, retType, s2c } = res
            console.log("KL: errCode %d, retMsg %s, retType %d", errCode, retMsg, retType);
            if (retType == RetType.RetType_Succeed) {
                let data = beautify(JSON.stringify(s2c), {
                    indent_size: 2,
                    space_in_empty_paren: true,
                });
                console.log(data);
                return data
            }
            return res
        } catch (error) {
            console.error("getorderbook error:", error);
            return error
        }
    }

}
