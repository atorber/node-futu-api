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
        类型
        <el-select id="sub-type" v-model="subType">
          <el-option
            v-for="item in subTypes"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </div>
    </div>
    <el-button type="primary" :disabled="btnDisable" v-on:click="onClick()"
      >订阅行情</el-button
    >
    <span id="err">{{ errMsg }}</span>
    <div id="output">
      <el-tag effect="dark">推送数据</el-tag>
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
  name: "qotPushDemo",
  data() {
    return {
      errMsg: "",
      btnDisable: true,

      market: 1,
      code: "00700",
      markets: [
        {
          value: 1, //Qot_Common.QotMarket_HK_Security
          label: "HK",
        },
        {
          value: 11, //Qot_Common.QotMarket_US_Security
          label: "US",
        },
        {
          value: 21, //Qot_Common.QotMarket_CNSH_Security
          label: "SH",
        },
        {
          value: 22, //Qot_Common.QotMarket_CNSZ_Security
          label: "SZ",
        },
      ],

      subType: 1,
      subTypes: [
        {
          value: 1, //Qot_Common.SubType_Basic
          label: "基础报价",
        },
        {
          value: 2, //Qot_Common.SubType_OrderBook
          label: "摆盘",
        },
        {
          value: 4, //Qot_Common.SubType_Ticker
          label: "逐笔",
        },
        {
          value: 5, //Qot_Common.SubType_RT
          label: "分时",
        },
        //......
      ],

      push_message: null,
      websocket: null,
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
      const req = {
        c2s: {
          securityList: [
            {
              market: this.market,
              code: this.code,
            },
          ],
          subTypeList: [this.subType],
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
          this.push_message = "";
        });
    },
    onPush(cmd, res) {
      const obj = ftWebsocket.findCmdObj(cmd);
      if (obj && obj.description && cmd >= 3005 && cmd <= 3015) {
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
        this.btnDisable = false;
      } else {
        this.errMsg = "error: 请检查是否有设置store.js中key字段";
        console.log("error:", msg);
      }
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

/deep/ #sub-type {
  width: 120px;
  margin-top: 10px;
  margin-left: 10px;
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