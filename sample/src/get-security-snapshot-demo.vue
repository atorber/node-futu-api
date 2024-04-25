<template>
  <div id="main">
    <div id="input">
      <div id="stock">
        股票
        <el-select id="market" v-model="market">
          <el-option
            v-for="item in options"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          ></el-option>
        </el-select>
      </div>
      <el-input id="code" v-model="code" placeholder="股票代码"></el-input>
    </div>
    <el-button type="primary" v-on:click="onClick()">获取股票快照</el-button>
    <span id="err">{{ errMsg }}</span>
    <div id="output">
      <el-tag effect="dark">快照数据</el-tag>
      <div id="content">
        <pre><code class="language-js" v-html="get_message"></code></pre>
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
  name: "getSecuritySnapshotDemo",
  data() {
    return {
      errMsg: "",
      market: 1,
      code: "00700",
      options: [
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

      get_message: null,
    };
  },
  created() {},
  destroyed() {},
  methods: {
    onClick() {
      this.errMsg = "";
      let websocket = new ftWebsocket();
      //参数1指定监听地址
      //参数2指定Websocket服务端口
      //参数3指定是否启用SSL，如果需要启用则需要在FutuOpenD配置相关选项
      //参数4指定连接的密钥，否则会连接超时，密钥在在FutuOpenD可配置，UI版本在不指定的情况下会随机指定
      websocket.start(
        this.$store.state.addr,
        this.$store.state.port,
        this.$store.state.enable_ssl,
        this.$store.state.key
      );

      websocket.onlogin = (ret, msg) => {
        if (ret) {
          const req = {
            c2s: {
              securityList: [
                {
                  market: this.market,
                  code: this.code,
                },
              ],
            },
          };
          websocket
            .GetSecuritySnapshot(req)
            .then((res) => {
              let code = beautify(JSON.stringify(res), {
                indent_size: 2,
                space_in_empty_paren: true,
              });
              this.get_message = prism.highlight(
                code,
                Prism.languages.javascript,
                "javascript"
              );
            })
            .catch((error) => {
              if ("retMsg" in error) {
                this.errMsg = "error: " + error.retMsg;
              }
              this.get_message = "";
              console.log("error:", error);
            });

          //关闭行情连接，连接不再使用之后，要关闭，否则占用不必要资源
          //同时OpenD也限制了最多128条连接
          //也可以一个页面或者一个项目维护一条连接，这里范例请求一次创建一条连接
          websocket.stop();
        } else {
          this.errMsg = "error: 请检查是否有设置store.js中key字段";
          console.log("error:", msg);
        }
      };
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