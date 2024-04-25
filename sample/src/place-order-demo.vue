<template>
  <div id="main">
    <div id="input">
      <div id="stock">
        股票
        <el-select id="market" v-model="market">
          <el-option
            v-for="item in markets"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
        <el-input id="code" v-model="code" placeholder="股票代码"></el-input>
      </div>
      <div>
        价格
        <el-input id="price" v-model="price" placeholder="价格"></el-input>
      </div>
      <div>
        数量
        <el-input id="qty" v-model="qty" placeholder="数量"></el-input>
      </div>
      <div>
        方向
        <el-select id="dir" v-model="dir">
          <el-option
            v-for="item in dirs"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </div>
      <div>
        订单
        <el-select id="order-type" v-model="orderType">
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
        <el-select id="env" v-model="env">
          <el-option
            v-for="item in envs"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </div>
    </div>
    <el-button type="primary" :disabled="btnDisable" v-on:click="onClick()"
      >下单</el-button
    >
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
      btnDisable: true,
      errMsg: "",

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
      dir: 1,
      dirs: [
        {
          value: 1, //Trd_Common.TrdSide_Buy
          label: "买入",
        },
        {
          value: 2, //Trd_Common.TrdSide_Sell
          label: "卖出",
        },
      ],

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
    };
  },
  created() {
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
  },
  destroyed() {
    //关闭行情连接，连接不再使用之后，要关闭，否则占用不必要资源
    //同时OpenD也限制了最多128条连接
    if (this.websocket != null) {
      this.websocket.stop();
    }
  },
  methods: {
    onClick() {
      this.errMsg = "";
      this.PlaceOrder();
    },

    onPush(cmd, res) {
      const obj = ftWebsocket.findCmdObj(cmd);
      if (obj && obj.description && cmd === 2208) {
        let code = beautify(JSON.stringify(res), {
          indent_size: 2,
          space_in_empty_paren: true,
        });
        this.push_message = prism.highlight(
          code,
          Prism.languages.javascript,
          "javascript"
        );
      }
    },
    onLogin(ret, msg) {
      if (ret) {
        this.GetAccListAndSubPush();
      } else {
        this.errMsg = "error: 请检查是否有设置store.js中key字段";
        console.log("error", msg);
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
              .then((res) => {
                if (res.retType == 0) {
                  this.btnDisable = false;
                }
              })
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
    PlaceOrder() {
      let tardeAccID = this.getTradeAccID();
      if (tardeAccID <= 0) {
        return;
      }

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
          trdSide: this.dir,
          orderType: this.orderType,
          code: this.code,
          qty: Number(this.qty),
          price: Number(this.price),
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