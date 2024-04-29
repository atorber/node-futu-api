import { Futu } from '../src/index.js';

const futu = new Futu();
const pwd = '' // 交易密码
const code = "03888"; // 金山软件
const accID = ''
const trdEnv = 1; // 1: 真实环境 0: 模拟环境

// 等待登录成功后再执行
(async () => {
  while (!futu.isLogin) {
    console.info("waiting for login...");
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  // 订阅
  await futu.Sub(code)

  // 获取订阅状态
  // await futu.GetSubInfo()

  // 实时报价回调
  // await futu.UpdateBasicQot(code)

  // 实时摆盘回调
  // await futu.UpdateOrderBook(code)

  // 实时K线回调
  // await futu.UpdateKL(code)

  // 实时分时回调
  // await futu.UpdateRT(code)

  // 实时逐笔回调
  // await futu.UpdateTicker(code)

  // 实时经纪队列回调
  // await futu.UpdateBroker(code)

  // 获取快照
  // await futu.GetSecuritySnapshot(code)

  // 获取实时报价
  const res = await futu.GetBasicQot(code)
  console.info('GetBasicQot', res.basicQotList[0])
  const price = res.basicQotList[0].curPrice
  console.info('price', price)

  // 获取实时摆盘
  // await futu.GetOrderBook(code)

  // 获取实时K线
  // await futu.GetKL(code)

  // 获取实时分时
  // await futu.GetRT(code)

  // 获取实时逐笔
  // await futu.GetTicker(code)

  // 获取实时经纪队列
  // await futu.GetBroker(code)

  // 反订阅
  // await futu.UnSub(code)

  // 获取交易业务账户列表
  // await futu.GetAccList()

  // 解锁交易
  await futu.UnlockTrade(pwd)

  // 设置交易账户
  futu.SetAcc(accID, trdEnv)

  // 查询账户资金
  // await futu.GetFunds()

  // 查询持仓
  // await futu.GetPositionList()

  // 获取融资融券数据
  // await futu.GetMarginRatio(code)

  // 下单
  // await futu.PlaceOrder(code, price, 200)
  await futu.GetOrderList()
})()
