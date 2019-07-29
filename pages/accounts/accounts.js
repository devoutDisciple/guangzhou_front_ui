import request from "../../utils/request";

// pages/accounts/accounts.js
Page({

	/**
	 * 页面的初始数据
	 */
	data: {
		orderList: [], // 订单数据
		totalPrice: 0.00, // 总价
		type: "car", // 默认是从shop点击进来的
		personDetail: {}, // 个人信息
		address: {}, // 默认收货地址
		show: false, // 备注信息弹框是否开启
		commentId: "", // 备注信息id
	},
	// 点击新增收货地址

	onClickAddAddress() {
		wx.navigateTo({
			url: "/pages/address/address?type=create"
		});
	},
	// 点击新增备注
	addComment(e) {
		let data = e.currentTarget.dataset.data;
		console.log(data);
		this.setData({
			show: !this.data.show,
			commentId: data.shop_id
		});
	},
	// 备注信息点击确定的时候
	confirmComment() {
		this.setData({
			show: !this.data.show
		});
	},
	// 备注信息点击取消的时候
	cancelComment() {
		let orderList = this.data.orderList, commentId = this.data.commentId;
		orderList.map(item => {
			if(item.shop_id == commentId) {
				item.comment = "";
				item.showComment = "口味,偏好等要求";
			}
		});
		this.setData({
			orderList
		});
	},
	// 键盘输入的时候
	textareaInput(e) {
		let value = e.detail.value;
		let orderList = this.data.orderList, commentId = this.data.commentId;
		orderList.map(item => {
			if(item.shop_id == commentId) {
				item.comment = value;
				item.showComment = value.length > 7 ? value.slice(0, 7) + "..." : value;
			}
		});
		this.setData({
			orderList
		});
	},
	// 支付订单
	submitOrder() {
		let self = this;
		let {address, orderList} = this.data;
		if(!address.phone) {
			wx.showModal({
				title: "请填写收货地址",
				confirmText: "确定"
			});
			return;
		}
		// 付钱
		request.get({
			url: "/pay/order",
			data: {
				total_fee: self.data.totalPrice,
			}
		}).then((res) => {
			let data = res.data;
			wx.requestPayment({
				timeStamp: String(data.timeStamp),
				nonceStr: data.nonceStr,
				package: data.package,
				signType: "MD5",
				paySign: data.paySign,
				success(res) {
					if (res.errMsg == "requestPayment:ok") {
						console.log("支付成功");
						let reqParams = [];
						orderList.map(item => {
							let order_list = [];
							item.goods.map(good => {
								order_list.push({
									goodsid: good.id,
									goodsName: good.name,
									goodsUrl: good.url,
									num: 1,
									price: good.price,
								});
							});
							reqParams.push({
								shopid: item.shopDetail.id,
								total_price: item.totalPrice,
								desc: item.comment,
								discount_price: 0,
								status: 1,
								send_price: String(item.shopDetail.send_price),
								package_cost: String(item.package_cost),
								order_list: JSON.stringify(order_list)
							});
						});
						request.post({
							url: "/order/add",
							data: {
								data: reqParams
							}
						}).then(() => {
							// 支付订单跳转到订单页面
							wx.navigateTo({
								url: "/pages/order/order"
							});
						});
					} else {
						wx.showModal({
							title: "支付失败",
							content: "支付失败, 请重新支付",
							confirmText: "重新支付",
							success: (result) => {
								if (result.confirm) self.submitOrder();
							}
						});
					}
				},
				fail(res) {
					console.log(res, "error");
					wx.showModal({
						title: "支付失败",
						content: "支付失败, 请重新支付",
						confirmText: "重新支付",
						success: (result) => {
							if (result.confirm) self.submitOrder();
						}
					});
				}
			});
		});
	},
	// 点击编辑收货地址
	goEditPage() {
		// 跳转到编辑地址表单页面
		wx.navigateTo({
			url: "/pages/myAddress/myAddress"
		});
	},

	/**
	 * 生命周期函数--监听页面加载
	 */
	onLoad: function(options) {
		let type = options.type;
		let pages = getCurrentPages();
		let prevPage = pages[pages.length - 2]; //上一个页面
		let data = prevPage.data;
		if (type == "detail") { // 从商品详情点击过来
			let orderList = data.orderList;
			orderList.map(item => {
				item.comment = "";
				item.package_cost = item.goods[0].package_cost;
				item.showComment = "口味,偏好等要求";
			});
			console.log(orderList, "orderlist---detail");
			this.setData({
				type: "shop",
				orderList: data.orderList,
				totalPrice: data.orderList[0].totalPrice,
			});
		}
		if(type == "car") {
			let orderList = data.orderList;
			let newOderList = [];
			let globalPrice = 0;
			orderList.map(item => {
				let totalPrice = 0;
				let package_cost = 0;
				item.map(item2 => {
					item2.name = item2.goodsName,
					// 总的餐盒费
					package_cost = Number(package_cost) + Number(item2.package_cost);
					totalPrice = totalPrice + Number(item2.price) * Number(item2.num);
				});
				// 总价 = 总的餐盒费 + 食物费用 + 配送费
				totalPrice = totalPrice + package_cost + (item[0].send_price);
				globalPrice = globalPrice + totalPrice;
				newOderList.push({
					comment: "",
					package_cost: package_cost,
					shopDetail: {
						id: item[0].shopid,
						name: item[0].shopName,
						send_price: item[0].send_price
					},
					totalPrice: totalPrice,
					goods: item,
					showComment: "口味,偏好等要求",
				});
			});
			console.log(newOderList, "orderlist ---- car");
			this.setData({
				type: "car",
				orderList: newOderList,
				totalPrice: globalPrice,
			});
		}

	},

	/**
	 * 生命周期函数--监听页面显示
	 */
	onShow: function () {
		// 获取个人信息
		request.get({
			url: "/user/getUserByOpenid"
		}).then(res => {
			let personDetail = res.data;
			let addressList = personDetail.address ? JSON.parse(personDetail.address) : [];
			let address = {};
			for (let i = 0; i < addressList.length; i++) {
				if (addressList[i].default) {
					address = addressList[i];
				}
			}
			this.setData({
				personDetail: personDetail,
				address: address
			});
		});
		// 设置标题
		wx.setNavigationBarTitle({
			title: "提交订单"
		});
		// 设置导航栏颜色
		wx.setNavigationBarColor({
			frontColor: "#000000", //前景颜色值
			backgroundColor: "#fff" //背景颜色值
		});
	}
});
