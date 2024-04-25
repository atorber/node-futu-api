<template>
  <div id="main">
    <div id="input">
      <div id="stock">
        股票
        <el-select id="market" v-model="market" :disabled="inputDisable">
          <el-option
            v-for="item in markets"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
        <el-input
          id="code"
          v-model="code"
          placeholder="股票代码"
          :disabled="inputDisable"
        ></el-input>
      </div>
      <div>
        数量
        <el-input
          id="qty"
          v-model="qty"
          placeholder="数量"
          :disabled="inputDisable"
        ></el-input>
      </div>
      <div>
        订单
        <el-select id="order-type" v-model="orderType" :disabled="inputDisable">
          <el-option
            v-for="item in orderTypes"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </div>
      <div>
        环境
        <el-select id="env" v-model="env" :disabled="inputDisable">
          <el-option
            v-for="item in envs"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </div>
    </div>
    <div>
      MACD参数
      <el-input
        id="short"
        v-model="short"
        placeholder="短周期"
        :disabled="inputDisable"
      ></el-input>
      <el-input
        id="long"
        v-model="long"
        placeholder="长周期"
        :disabled="inputDisable"
      ></el-input>
      <el-input
        id="smooth"
        v-model="smooth"
        placeholder="平滑周期"
        :disabled="inputDisable"
      ></el-input>
    </div>
    <div>
      MACD
      <span class="macd-res">DIF: {{ curDif }}</span>
      <span class="macd-res">DEA: {{ curDea }}</span>
      <span class="macd-res">MACD: {{ curMacd }}</span>
    </div>

    <el-button type="primary" v-on:click="onClick()">{{ btnTxt }}</el-button>
    <span id="err">{{ errMsg }}</span>
    <div id="output">
      <el-tag effect="dark">订单数据</el-tag>
      <div id="content">
        <pre><code class="language-js" v-html="push_message"></code></pre>
      </div>
    </div>
  </div>
</template>

<script>
import "../public/prism.css";
import ftWebsocket from "futu-api";
import beautify from "js-beautify";
import prism from "prismjs";

export default {
  name: "placeOrderDemo",
  data() {
    return {
      errMsg: "",
      inputDisable: false,

      run: false,

      short: 12,
      long: 26,
      smooth: 9,

      market: 1,
      code: "00700",
      markets: [
        {
          value: 1, //Trd_Common.TrdMarket_HK
          label: "HK",
        },
        {
          value: 2, //Trd_Common.TrdMarket_US
          label: "US",
        },
      ],

      price: "",
      qty: "100",

      env: 0,
      envs: [
        {
          value: 0, //Trd_Common.TrdEnv_Simulate
          label: "模拟环境",
        },
        {
          value: 1, //Trd_Common.TrdEnv_Real
          label: "真实环境",
        },
      ],

      orderType: 1,
      orderTypes: [
        {
          value: 1, //Trd_Common.OrderType_Normal
          label: "普通订单",
        },
        {
          value: 2, //Trd_Common.OrderType_Market
          label: "市价订单",
        },
      ],

      push_message: null,
      websocket: null,

      tradeAccInfo: [],
      tradeSerialNo: 0,
      closeData: [],
      lastTimestamp: 0,
      dif: [],
      dea: [],
      macd: [],

      curDif: 0,
      curDea: 0,
      curMacd: 0,

      lastTrdSide: 0,
    };
  },
  created() {},
  destroyed() {
    if (this.websocket != null) {
      this.websocket.stop();
    }
  },
  computed: {
    btnTxt() {
      return this.run ? "停止策略" : "启动策略";
    },
  },

  methods: {
    onClick() {
      this.errMsg = "";
      this.run = !this.run;
      this.inputDisable = this.run;
      if (this.run) {
        this.websocket = new ftWebsocket();
        //参数1指定监听地址
        //参数2指定Websocket服务端口
        //参数3指定是否启用SSL，如果需要启用则需要在FutuOpenD配置相关选项
        //参数4指定连接的密钥，否则会连接超时，密钥在在FutuOpenD可配置，UI版本在不指定的情况下会随机指定
        this.websocket.start(
          this.$store.state.addr,
          this.$store.state.port,
          this.$store.state.enable_ssl,
          this.$store.state.key
        );
        this.websocket.onPush = this.onPush.bind(this);
        this.websocket.onlogin = this.onLogin.bind(this);
      } else {
        if (this.websocket != null) {
          this.websocket.stop();
          this.closeData = [];
          this.lastTimestamp = 0;
          this.dif = [];
          this.dea = [];
          this.macd = [];
          this.tradeSerialNo = 0;
          this.push_message = null;
          this.websocket = null;
          this.tradeTimestamp = 0;
        }
      }
    },

    onPush(cmd, res) {
      const obj = ftWebsocket.findCmdObj(cmd);
      if (obj && obj.description) {
        if (cmd == 2208) {
          //订单推送
          let code = beautify(JSON.stringify(res), {
            indent_size: 2,
            space_in_empty_paren: true,
          });
          this.push_message = prism.highlight(
            code,
            Prism.languages.javascript,
            "javascript"
          );
        } else if (cmd === 3007) {
          //K线推送
          if ((res.s2c.security.code = this.code)) {
            for (let i = 0; i < res.s2c.klList.length; ++i) {
              const klData = res.s2c.klList[i];
              if (klData.timestamp > this.lastTimestamp) {
                this.closeData.push(klData.closePrice);
              } else if (klData.timestamp == this.lastTimestamp) {
                this.closeData[this.closeData.length - 1] = klData.closePrice;
              }
            }
            this.price = this.closeData[this.closeData.length - 1];
            //判断买卖时机
            this.macdBuySell();
          }
        }
      }
    },
    onLogin(ret, msg) {
      if (ret) {
        this.GetAccListAndSubPush();
        this.SubKL();
        this.GetKL();
      } else {
        this.errMsg = "error: 请检查是否有设置store.js中key字段";
        console.log("error", msg);
      }
    },
    ema(input, n) {
      let ouput = [];
      if (input.length > 0) {
        let lastEMA = input[0];
        ouput.push(lastEMA);
        for (let i = 1; i < input.length; ++i) {
          let ema = (input[i] * 2 + lastEMA * (n - 1)) / (n + 1);
          ouput.push(ema);
          lastEMA = ema;
        }
      }
      return ouput;
    },
    macdCal() {
      this.dif = [];
      this.dea = [];
      this.macd = [];

      let shortData = this.ema(this.closeData, this.short);
      let longData = this.ema(this.closeData, this.long);

      for (let i = 0; i < shortData.length && i < longData.length; ++i) {
        this.dif.push(shortData[i] - longData[i]);
      }

      this.dea = this.ema(this.dif, this.smooth);
      for (let i = 0; i < this.dif.length && i < this.dea.length; ++i) {
        this.macd.push((this.dif[i] - this.dea[i]) * 2);
      }

      this.curDif = this.dif[this.dif.length - 1].toFixed(3);
      this.curDea = this.dea[this.dea.length - 1].toFixed(3);
      this.curMacd = this.macd[this.macd.length - 1].toFixed(3);
    },
    macdBuySell() {
      this.macdCal();
      if (this.dif.length > 1 && this.dea.length > 1) {
        if (
          this.dif[this.dif.length - 1] < this.dea[this.dea.length - 1] &&
          this.dif[this.dif.length - 2] > this.dea[this.dea.length - 2]
        ) {
          //卖出
          //Trd_Common.TrdSide_Sell
          this.PlaceOrder(2);
          this.tradeTimestamp = this.lastTimestamp;
        }

        if (
          this.dif[this.dif.length - 1] > this.dea[this.dea.length - 1] &&
          this.dif[this.dif.length - 2] < this.dea[this.dea.length - 2]
        ) {
          //买入
          //Trd_Common.TrdSide_Buy
          this.PlaceOrder(1);
          this.tradeTimestamp = this.lastTimestamp;
        }
      }
    },
    getTradeAccID() {
      for (let i = 0; i < this.tradeAccInfo.length; ++i) {
        let acc = this.tradeAccInfo[i];
        if (acc.env == this.env && acc.market == this.market) {
          return acc.accID;
        }
      }
      return 0;
    },
    SubKL() {
      const req = {
        c2s: {
          securityList: [
            {
              market: this.market,
              code: this.code,
            },
          ],
          subTypeList: [6], //SubType_KL_Day = 6;
          isSubOrUnSub: true,
          isRegOrUnRegPush: true,
        },
      };

      this.websocket
        .Sub(req)
        .then((res) => {})
        .catch((error) => {
          if ("retMsg" in error) {
            this.errMsg = "error: " + error.retMsg;
          }
          console.log("error:", error);
        });
    },
    GetKL() {
      const req = {
        c2s: {
          rehabType: 1, //RehabType_Forward = 1;
          klType: 2, //KLType_Day = 2;
          security: {
            market: this.market,
            code: this.code,
          },
          reqNum: 1000,
        },
      };

      this.websocket
        .GetKL(req)
        .then((res) => {
          if (res.retType == 0) {
            this.closeData = [];
            for (let i = 0; i < res.s2c.klList.length; ++i) {
              const klData = res.s2c.klList[i];
              this.closeData.push(klData.closePrice);
              this.lastTimestamp = klData.timestamp;
            }
          } else {
            this.errMsg = "error: " + res.retMsg;
            console.log("error", res.retMsg);
          }
        })
        .catch((error) => {
          if ("retMsg" in error) {
            this.errMsg = "error: " + error.retMsg;
          }
          console.log("error:", error);
        });
    },
    GetAccListAndSubPush() {
      const req = {
        c2s: {
          userID: 0,
        },
      };
      this.websocket
        .GetAccList(req)
        .then((res) => {
          if (res.retType == 0) {
            let accIDList = [];
            for (let i = 0; i < res.s2c.accList.length; ++i) {
              let acc = res.s2c.accList[i];
              let item = {};
              item.env = acc.trdEnv;
              item.market = acc.trdMarketAuthList[0];
              item.accID = acc.accID;
              this.tradeAccInfo.push(item);
              accIDList.push(acc.accID);
            }
            //订阅业务ID的交易推送
            const req = {
              c2s: {
                accIDList: accIDList,
              },
            };
            this.websocket
              .SubAccPush(req)
              .then((res) => {})
              .catch((error) => {
                if ("retMsg" in error) {
                  this.errMsg = "error: " + error.retMsg;
                }
                console.log("error:", error);
              });
          } else {
            this.errMsg = "error: " + res.retMsg;
            console.log("error", res.retMsg);
          }
        })
        .catch((error) => {
          if ("retMsg" in error) {
            this.errMsg = "error: " + error.retMsg;
          }
          console.log("error:", error);
        });
    },
    PlaceOrder(dir) {
      //防止连续触发，只能买卖交替触发
      if (this.lastTrdSide == dir) {
        return;
      }
      let tardeAccID = this.getTradeAccID();
      if (tardeAccID <= 0) {
        return;
      }
      this.lastTrdSide = dir;
      const req = {
        c2s: {
          packetID: {
            connID: this.websocket.getConnID(),
            serialNo: this.tradeSerialNo++,
          },
          header: {
            trdEnv: this.env,
            accID: tardeAccID,
            trdMarket: this.market,
          },
          trdSide: dir,
          orderType: this.orderType,
          code: this.code,
          qty: Number(this.qty),
          price: Number(this.price),
          adjustPrice: true,
          adjustSideAndLimit: 0.1,
          secMarket: this.market, //TrdSecMarket
        },
      };

      this.websocket
        .PlaceOrder(req)
        .then((res) => {})
        .catch((error) => {
          if ("retMsg" in error) {
            this.errMsg = "error: " + error.retMsg;
          }
          console.log("error:", error);
        });
    },
  },
};
</script>

<style rel="stylesheet/scss" lang="scss" scoped>
.el-input {
  display: inline;
}

.el-button {
  margin-top: 20px;
}

/deep/ #stock {
  display: inline;
}

/deep/ #market {
  width: 70px;
  margin-left: 10px;
}

/deep/ #code {
  width: 100px;
  margin-left: 5px;
}

/deep/ #price {
  width: 100px;
  margin-left: 10px;
  margin-top: 10px;
}

/deep/ #qty {
  width: 100px;
  margin-left: 10px;
  margin-top: 10px;
}

/deep/ #dir {
  width: 100px;
  margin-left: 10px;
  margin-top: 10px;
}

/deep/ #env {
  width: 120px;
  margin-left: 10px;
  margin-top: 10px;
}

/deep/ #order-type {
  width: 120px;
  margin-left: 10px;
  margin-top: 10px;
}

/deep/ #short {
  width: 60px;
  margin-left: 10px;
  margin-top: 10px;
  margin-bottom: 10px;
}

/deep/ #long {
  width: 60px;
  margin-left: 10px;
  margin-top: 10px;
  margin-bottom: 10px;
}

/deep/ #smooth {
  width: 60px;
  margin-left: 10px;
  margin-top: 10px;
  margin-bottom: 10px;
}

/deep/ .macd-res {
  margin-right: 10px;
}

/deep/ #err {
  color: firebrick;
  margin-left: 15px;
}

#output {
  font-size: 14px;
  text-align: left;
  margin-top: 20px;
  #content {
    padding: 30px;
    border: 1px solid #d8dfe6;
  }
}
</style>