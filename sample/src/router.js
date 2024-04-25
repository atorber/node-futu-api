import Vue from 'vue'
import Router from 'vue-router'
import getSecuritySnapshotDemo from './get-security-snapshot-demo'
import quotePushDemo from './quote-push-demo'
import placeOrderDemo from './place-order-demo'
import macdStrategy from './macd-strategy'

Vue.use(Router)

export default new Router({
  routes: [
    {
      path: '/',
      name: 'getSecuritySnapshotDemo',
      component: getSecuritySnapshotDemo
    },
    {
      path: '/get-security-snapshot-demo',
      name: 'getSecuritySnapshotDemo',
      component: getSecuritySnapshotDemo
    },
    {
      path: '/quote-push-demo',
      name: 'quotePushDemo',
      component: quotePushDemo
    },
    {
      path: '/place-order-demo',
      name: 'placeOrderDemo',
      component: placeOrderDemo
    },
    {
      path: '/macd-strategy',
      name: 'macdStrategy',
      component: macdStrategy
    },
  ]
})
