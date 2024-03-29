const request = require("../../utils/request");
const orderUtil = require("../../utils/orderUtil");
const moment = require("../../utils/moment.min");
import Dialog from "../../dist/dialog/dialog";
import Toast from "../../dist/toast/toast";

Page({

	/**
   * 页面的初始数据
   */
	data: {
		activeBar: 1, // 应该显示的订单bar
		list: [], // 显示的订单
		actions: [ // 联系私厨按钮
			{
				name: "联系私厨"
			},
			{
				name: "申请退款"
			},
		],
		orderid: "", // 正在操作的商家id
	},

	// 点击切换bar
	onChange(event) {
		let type = event.detail.index + 1;
		this.setData({
			activeBar: type
		}, () => {
			this.onSearchOrder(type);
		});

	},

	// 查询订单
	onSearchOrder(type) {
		wx.showLoading({
			title: "加载中",
			mask: true
		});
		request.get({url: "/order/getListByOpenid", data: {type: type}}).then(res => {
			let data = res.data || [];
			this.setData({
				list: data.map(item => {
					item.status_cn = orderUtil.filterStatus(item.status);
					item.order_time = moment(item.order_time).format("YYYY-MM-DD HH:mm:ss");
					return item;
				})
			}, () => {
				wx.hideLoading();
			});
		});
	},

	// 进入商店主页
	goToShop(e) {
		let data = e.currentTarget.dataset.data;
		let shopid = data.shopid;
		wx.navigateTo({
			url: `/pages/shop/shop?id=${shopid}`
		});
	},

	// 进入菜品主页
	goToGoodsDetail(e) {
		let data = e.currentTarget.dataset.data;
		let goodsid = data.goodsid;
		wx.navigateTo({
			url: `/pages/goodsDetail/goodsDetail?id=${goodsid}`
		});
	},

	// 确认收货
	getGoods(e) {
		let data = e.currentTarget.dataset.data;
		Dialog.confirm({
			cancelButtonText: "取消",
			message: "确认商品已送达?"
		}).then(() => {
			// on close  updateOrderStatus
			request.post({url: "/order/updateOrderStatus", data: {status: 3, id: data.id}}).then(res => {
				if(res.data == "success") {
					this.onSearchOrder(1);
					wx.navigateTo({
						url: `/pages/orderEvaluate/orderEvaluate?id=${data.id}`
					});
					Toast.success("确认收货成功");
				}
			});
		}).catch(() => {
			// on cancel
		});
	},

	// 点击评价
	evaluateOrder(e) {
		let data = e.currentTarget.dataset.data;
		wx.navigateTo({
			url: `/pages/orderEvaluate/orderEvaluate?id=${data.id}`
		});
	},

	// 点击联系私厨
	connectShop(e) {
		let data = e.currentTarget.dataset.data;
		let orderid = data.id;
		if(data.status == 4 || data.status == 3 || data.status == 5) {
			return request.get({url: "/order/getOrderById", data: {id: orderid}}).then(res => {
				let data = res.data || {};
				let phone = data.shopPhone || "13670716668";
				wx.makePhoneCall({
					phoneNumber: phone // 仅为示例，并非真实的电话号码
				});
			});
		}
		this.setData({
			orderid: data.id
		}, () =>this.setData({show: true}));
	},

	onClose() {
		this.setData({
			show: false
		});
	},

	// 联系私厨选择
	onSelect(event) {
		let orderid = this.data.orderid;
		request.get({url: "/order/getOrderById", data: {id: orderid}}).then(res => {
			let data = res.data || {};
			let phone = data.shopPhone || "13670716668";
			let value = event.detail;
			if(value.name == "联系私厨") {
				wx.makePhoneCall({
					phoneNumber: phone // 仅为示例，并非真实的电话号码
				});
			}
			if(value.name == "申请退款") {
				Dialog.confirm({
					title: "建议联系私厨",
					confirmButtonText: "申请退款",
					cancelButtonText: "联系私厨",
					message: "提前联系私厨可以提高退款效率哦"
				}).then(() => {
					request.post({url: "/pay/getBackMoneyStatus", data: {id: orderid}}).then(res => {
						this.onSearchOrder(this.data.activeBar);
						this.setData({show: false});
						if(res.data == "success") return Toast.success("申请成功, 等待商家确认!");
						return Toast.fail(res.data);
					});
				}).catch(() => {
					wx.makePhoneCall({
						phoneNumber: phone // 仅为示例，并非真实的电话号码
					});
				});
			}
		});
	},

	/**
   * 生命周期函数--监听页面加载
   */
	onLoad: function () {
	},

	/**
   * 生命周期函数--监听页面显示
   */
	onShow: function () {
		wx.setNavigationBarTitle({
			title: "我的订单"
		});
		// 设置导航栏颜色
		wx.setNavigationBarColor({
			frontColor: "#000000", //前景颜色值
			backgroundColor: "#f2f2f2" //背景颜色值
		});
		this.onSearchOrder(1);
	},

	/**
   * 用户点击右上角分享
   */
	onShareAppMessage: function () {
		return {
			title: "专注每一道私房菜!",
			path: "/pages/home/home",
			imageUrl: "http://www.bws666.com/LOGO.png"
		};
	}
});
