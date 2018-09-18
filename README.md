# WePY Image Uploader


## 简介

「WePY Image Uploader」是基于「WePY」小程序框架所开发的**图片上传**组件，其UI和交互如下图所示：

![UI截图](https://raw.githubusercontent.com/beiliao-web-frontend/wepy-img-uploader/master/screenshots/screenshot.jpg)

- 点击加号可选择图片进行上传；
- 上传过程中，图片上方有黑色的半透明覆盖层，其宽度随着上传进度而变化，起到进度条的作用；
- 上传过程中，不阻塞界面上的其他操作；
- 点击已上传或上传中图片右上角的叉，可以移除图片（仅在页面数据中移除，非移除图片本身）；

（注意：本组件目前仅支持基于「WePY」开发的微信小程序项目）


## 安装

在小程序项目目录下安装本组件：

``` bash
npm install wepy-img-uploader --save
```


## 属性说明

### imgs
- 说明：初始图片URL。
- 必填：否。
- 类型：字符串数组或对象数组。为对象数组时，每个对象应包含 img 和 thumb 两个属性，分别表示 原图URL 和 缩略图URL 。
- 默认值：空数组。

### count
- 说明：最大图片数量。
- 必填：否。
- 类型：数字。
- 默认值：1。

### beforeUpload
- 说明：上传前执行的函数，一般用于获取云存储的 token ，必须返回 Promise 。
- 必填：否。
- 类型：函数。
- 默认值：无。

### upload
- 说明：执行上传的函数，必须返回 UploadTask 。
- 必填：无。
- 类型：函数，其参数依次为：
  - 图片路径（本地临时路径）；
  - beforeUpload返回的数据；
  - 用于解决上传Promise的resolve函数，上传成功后传入图片路径调用；
  - 用于拒绝上传Promise的reject函数，上传失败时传入错误对象调用。


### 事件说明

### change

- 说明：文件上传完成（无论成功与否）后触发。
- 事件参数属性：
  - imgs：上传结果数组，数组中的字符串值即为已上传图片的URL，false值表示该图片还在上传中。


## 调用示例

``` html
<template lang="wxml">
	<view class="container">
		<uploader :count="imgCount" :imgs="imgs" :beforeUpload="beforeUpload" :upload="upload" @change.user="uploadChange"  />
	</view>
</template>

<style>
.container { margin-left: 45rpx; }
</style>

<script>
import wepy from 'wepy';
import WepyImgUploader from 'wepy-img-uploader';

export default class Test extends wepy.page {
	components = {
		uploader: WepyImgUploader
	}

	data = {
		// 初始图片
		imgs: [
			'https://qiniu-pic.ibeiliao.com/Ft7Zv-D_fGeNY3JiMDVxpCQ0yUFu',
			'https://qiniu-pic.ibeiliao.com/Fi3PDHm46m6rIEWa4RGSlwl_ffYp',
			'https://qiniu-pic.ibeiliao.com/Fif-BoZQwXNB14yQsuDu-4vugE-W',
			'https://qiniu-pic.ibeiliao.com/FiXPzJ94pFrEEETqKwUp4aciHxZl'
		].map((url) => {
			return {
				img: url,
				// 假设resizeImg为生成缩略图URL的函数
				thumb: resizeImg(url, 300)
			};
		}),

		// 记录上传结果
		uploadResult: null,

		// 最大图片数量
		imgCount: 8,

		// 上传前先获取token
		beforeUpload() {
			// 假设getToken为获取上传token的方法
			return getToken();
		},

		// 上传
		upload(path, token, resolve, reject) {
			return wx.uploadFile({
				// 此处省略其他参数
				success(res) {
					if (res.statusCode === 200) {
						// 上传成功后返回URL
						resolve(res.data.url);
					} else {
						const e = new Error(res.errMsg);
						e.code = res.statusCode;
						reject(e);
					}
				},
				fail(e) {
					reject(new Error(e.errMsg));
				}
			});
		}
	}

	methods = {
		// 每个文件上传成功都会触发change事件
		uploadChange(e) {
			this.uploadResult = e.imgs;
		}
	}

	onLoad() {
	}
}
</script>
```


## 注意事项

- 使用不同的数据项记录初始图片和上传结果（例如示例中的 imgs 和 uploadResult 为两项数据），否则可能导致异常情况。
- 通过判断上传结果数组中是否包含false值，即可得知图片是否全部上传完成。
