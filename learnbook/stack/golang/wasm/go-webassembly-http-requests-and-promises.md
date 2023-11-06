# Go、WebAssembly、HTTP 请求和 Promise

?> - 应用实现：[wasm_http_go](https://github.com/kugoucode/wasm_http_go)

[WebAssembly](https://webassembly.org/)或 Wasm 是一种开放标准，允许开发人员使用编译的编程语言构建在 Web 浏览器中运行的应用程序。借助 WebAssembly，可以使用 C/C++、Rust、C# 和 Go 等语言编写 Web 应用程序的组件，这些语言与 JavaScript 在同一沙箱中运行。这允许移植现有库、利用 JavaScript 中不可用的功能以及更快地运行代码，因为 WebAssembly 被编译为二进制格式。

最近，我一直在尝试使用 WebAssembly，以便能够在浏览器中运行一些 Go 代码。具体来说，我一直在尝试移植[prvt](https://github.com/italypaleale/prvt)（一个用于存储端到端加密文档的开源项目）的某些部分，以便直接在 Web 浏览器中运行。WebAssembly 实验的原因有两个：首先，prvt 广泛使用了密码学和流，而这两种技术在 JavaScript 中还不是很出色；其次，prvt 本身是用 Go 编写的，因此能够在浏览器中重用代码将大大简化开发。

> 有关**将 WebAssembly 与 Go 结合使用的介绍**，我推荐[这篇有关 Golang Bot 的文章](https://golangbot.com/webassembly-using-go/)。[此外，可以在 Go 项目的GitHub wiki和](https://github.com/golang/go/wiki/WebAssembly)[syscall/js](https://golang.org/pkg/syscall/js/)包的文档中找到更多信息。请注意，截至撰写本文时，**Go 中的 WebAssembly 支持仍处于实验阶段**。因此，API 也可能会发生变化。本文针对 Go 1.15 进行了测试。


本文包含我在处理 WebAssembly 端口时学到的四个不同但相互关联的东西，我认为分享这些内容很有用。

1. 使用 Go 代码并创建 JavaScript 对象
2. 在 Go 中创建 Promise 来传递异步结果
3. 从 Go 代码发出 HTTP 请求
4. 从 Go 代码流式传输

## WebAssembly 和 Go 中的 JavaScript 对象

Go 的 WebAssembly 运行时会自动将最常见的 Go 类型转换为其 JavaScript 等效类型。[js.ValueOf](https://golang.org/pkg/syscall/js/#ValueOf)方法的文档包含一个很好的总结表，说明 Go 和 JavaScript 类型如何匹配：

```text
| Go                     | JavaScript             |
| ---------------------- | ---------------------- |
| js.Value               | [its value]            |
| js.Func                | function               |
| nil                    | null                   |
| bool                   | boolean                |
| integers and floats    | number                 |
| string                 | string                 |
| []interface{}          | new array              |
| map[string]interface{} | new object             |
```

从这里，您可以看到最常见的类型（例如数字、布尔值和字符串）会自动转换。最后一行特别有趣，因为它解释了如何传递“普通旧 JavaScript 对象”（POJO），这是最简单的对象类型（也称为字典）。

例如，以下 Go 代码定义了一个`MyGoFunc`可以从 JavaScript 代码调用的函数，该函数返回一个包含字符串和数字的字典（如您所见，类型可以是异构的）。

> 有关如何将 Go 代码编译为 WebAssembly 的说明，请查看Wiki 的[入门部分。](https://github.com/golang/go/wiki/WebAssembly#getting-started)

```go
// Copyright (C) 2020 Alessandro Segala (ItalyPaleAle)
// License: MIT

package main

// Import the package to access the Wasm environment
import (
	"syscall/js"
)

// Main function: it sets up our Wasm application
func main() {
	// Define the function "MyGoFunc" in the JavaScript scope
	js.Global().Set("MyGoFunc", MyGoFunc())
	// Prevent the function from returning, which is required in a wasm module
	select {}
}

// MyGoFunc returns a JavaScript function
func MyGoFunc() js.Func {
	return js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		// Return a JS dictionary with two keys (of heterogeneous type)
		return map[string]interface{}{
			"hello":  "world",
			"answer": 42,
		}
	})
}
```

将代码编译到 WebAssembly 并将其导入 JavaScript 代码后，您可以`MyGoFunc()`从 JavaScript 调用来查看结果。例如：

```js
console.log(MyGoFunc())
// Prints: {hello: "world", answer: 42}
```

然而，文档不太明确的是，我们还可以在 Go 代码中**使用任何 JavaScript 对象，****甚至是内置对象**！这就是事情开始变得更有趣的地方。

例如，让我们尝试将日期作为[`Date`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)对象传递。为此，我们首先需要获取构造函数，从 JS 的全局范围`Date`加载它：`js.Value`

```go
dateConstructor := js.Global().Get("Date")
```

然后，我们可以使用该方法从该构造函数创建一个新对象，将任何参数传递给它，就像在 JavaScript 中`dateConstructor.New`传递给构造函数一样。`new Date()`调用的结果是一个`js.Value`可以返回给 JavaScript 的结果：

```go
dateConstructor.New("2020-10-01")
```

因此，我们可以修改我们的方法`MyGoFunc`以返回 Go 中计算的当前日期：

```go
// Copyright (C) 2020 Alessandro Segala (ItalyPaleAle)
// License: MIT

// MyGoFunc returns a Go time.Time to JavaScript
func MyGoFunc() js.Func {
	return js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		// Get the current time as a Go time.Time object
		now := time.Now()
		// Get the Date object constructor from JavaScript
		dateConstructor := js.Global().Get("Date")
		// Return a new JS "Date" object with the time from the Go "now" variable
		// We're passing the UNIX timestamp to the "Date" constructor
		// Because JS uses milliseconds for UNIX timestamp, we need to multiply the timestamp by 1000
		return dateConstructor.New(now.Unix() * 1000)
	})
}
```

`MyGoFunc()`在 JavaScript 代码中调用现在将返回一个`Date`对象：

```js
let d = MyGoFunc()
console.log(typeof d)
console.log(d instanceof Date)
console.log(d.toString())

/*
Prints:

object
true
Sat Oct 03 2020 10:58:27 GMT-0700 (Pacific Daylight Time)
*/
```

## 带有 Go 承诺的异步 JS

在 JavaScript 中，[`Promise`是](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)async/await 的基础。如果您需要复习一下 Promise，[这是一篇很好的文章](https://javascript.info/promise-basics)。

例如，考虑以下代码，它创建一个 Promise，并在 3 秒后通过一条消息（[意大利语绕口令）进行解析：](https://www.mamalisa.com/?t=es&p=5534)

```js
const p = new Promise((resolve, reject) => {
    setTimeout(() => {
        resolve("sopra la panca la capra campa, sotto la panca la capra crepa")
    }, 3000)
})
```

在`async`函数中，您可以`await`使用上面的 Promise，因此 3 秒后您会收到消息：

```js
// This is an async function, which can contain "await" statements inside
async function MyFunc() {
    // Create the Promise
    const p = new Promise((resolve, reject) => {
        // After a 3 second timeout, this calls "resolve" with the message we're passing
        setTimeout(() => {
            resolve("sopra la panca la capra campa, sotto la panca la capra crepa")
        }, 3000)
    })
    // Await for the Promise - this resolves after 3 seconds
    const message = await p
    console.log(message)
}
```

调用`MyFunc()`将显示`sopra la panca la capra campa, sotto la panca la capra crepa`在控制台中。

在 Go 中使用 Wasm 时，Promise 尤为重要。

事实上，根据文档，您不能在由 JavaScript 直接调用的函数内进行 Go 中的阻塞调用 - 如果这样做，您将立即陷入死锁，并且您的应用程序将崩溃。相反，文档建议所有阻塞调用都在 goroutine 内，这会引发将值返回给 JavaScript 代码的问题。引用[文档](https://golang.org/pkg/syscall/js/#FuncOf)：

> 从 JavaScript 调用封装的 Go 函数将暂停事件循环并生成一个新的 goroutine。在从 Go 调用 JavaScript 期间触发的其他包装函数会在同一个 goroutine 上执行。  
> 因此，如果一个包装函数阻塞，JavaScript 的事件循环将被阻塞，直到该函数返回。因此，调用任何需要事件循环的异步 JavaScript API（例如 fetch (http.Client)）将立即导致死锁。因此，阻塞函数应该显式启动一个新的 goroutine。

使用 Promise 或许是解决这个问题的最佳方法：避免死锁，同时允许使用惯用的 JavaScript 进行编程。

我们在上一节中看到，我们可以从 Go 创建自定义 JavaScript 对象，这也适用于 Promise！我们只需要`Promise`通过将函数传递给构造函数来创建对象。就像上面的纯 JS 代码一样，这个函数接收两个参数，它们本身就是函数：`resolve`应该在 Promise 工作完成时调用最终结果，并且`reject`可以在出现错误导致 Promise 失败时调用。

这是一个更新， 3 秒后`MyGoFunc`会显示一条消息（[另一个意大利绕口令！ ）：](http://www.bbc.co.uk/languages/yoursay/tongue_twisters/italian/trotting_trentonians.shtml)

```go
// Copyright (C) 2020 Alessandro Segala (ItalyPaleAle)
// License: MIT

// MyGoFunc returns a Promise that resolves after 3 seconds with a message
func MyGoFunc() js.Func {
	return js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		// Handler for the Promise: this is a JS function
		// It receives two arguments, which are JS functions themselves: resolve and reject
		handler := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
			resolve := args[0]
			// Commented out because this Promise never fails
			//reject := args[1]

			// Now that we have a way to return the response to JS, spawn a goroutine
			// This way, we don't block the event loop and avoid a deadlock
			go func() {
				// Block the goroutine for 3 seconds
				time.Sleep(3 * time.Second)
				// Resolve the Promise, passing anything back to JavaScript
				// This is done by invoking the "resolve" function passed to the handler
				resolve.Invoke("Trentatré Trentini entrarono a Trento, tutti e trentatré trotterellando")
			}()

			// The handler of a Promise doesn't return any value
			return nil
		})

		// Create and return the Promise object
		promiseConstructor := js.Global().Get("Promise")
		return promiseConstructor.New(handler)
	})
}
```

要从 JavaScript 调用它：

```js
async function MyFunc() {
    // Get the Promise from Go
    const p = MyGoFunc()
    // Show the current UNIX timestamps (in seconds)
    console.log(Math.floor(Date.now() / 1000))
    // Await for the Promise to resolve
    const message = await p
    // Show the current timestamp in seconds, then the result of the Promise
    console.log(Math.floor(Date.now() / 1000), message)
}

/*
Result:
  1601746916
  1601746919 "Trentatré Trentini entrarono a Trento, tutti e trentatré trotterellando"
*/
```

如果您的 Go 代码出现错误，您可以使用该`reject`函数向 JavaScript 抛出异常。例如：

```go
// Copyright (C) 2020 Alessandro Segala (ItalyPaleAle)
// License: MIT

// MyGoFunc returns a Promise that fails with an exception about 50% of times
func MyGoFunc() js.Func {
	return js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		// Handler for the Promise
		handler := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
			resolve := args[0]
			reject := args[1]

			// Run this code asynchronously
			go func() {
				// Cause a failure 50% of times
				if rand.Int()%2 == 0 {
					// Invoke the resolve function passing a plain JS object/dictionary
					resolve.Invoke(map[string]interface{}{
						"message": "Hooray, it worked!",
						"error":   nil,
					})
				} else {
					// Assume this were a Go error object
					err := errors.New("Nope, it failed")

					// Create a JS Error object and pass it to the reject function
					// The constructor for Error accepts a string,
					// so we need to get the error message as string from "err"
					errorConstructor := js.Global().Get("Error")
					errorObject := errorConstructor.New(err.Error())
					reject.Invoke(errorObject)
				}
			}()

			// The handler of a Promise doesn't return any value
			return nil
		})

		// Create and return the Promise object
		promiseConstructor := js.Global().Get("Promise")
		return promiseConstructor.New(handler)
	})
}
```

当您从 JavaScript 调用此函数时，大约一半的情况下您会看到返回的对象，而另一半的情况下您会收到异常。请注意，我们`reject`使用实际的 JavaScript`Error`对象调用该函数，这是 JavaScript 中的最佳实践！

```js
async function MyFunc() {
    try {
        console.log(await MyGoFunc())
    } catch (err) {
        console.error('Caught exception', err)
    }
}

/*
Result is either:
  {error: null, message: "Hooray, it worked!"}
Or a caught exception (followed by the stack trace):
  Caught exception Error: Nope, it failed
*/
```

## 从 Go 代码发出 HTTP 请求

最后，让我们看看如何使用 Go 和 WebAssembly 发出 HTTP 请求，这是一项非常常见的任务。例如，您可以在[Service Worker](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers)中执行此操作以[拦截网络请求](https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent)并让 Go 处理它们（这就是我使用 prvt 所做的，因此 Go 代码可以解密文件）。

有两件重要的事情需要记住：

1. 来自 Go 的网络调用是阻塞的，因此它们必须在单独的 Goroutine 中执行。因此，我们应该从 Go 返回一个 Promise 到 JavaScript，最终根据网络请求的结果进行解析。
2. 如果您的目标是拦截网络请求，那么您的 Go 代码应该返回封装在 JavaScript 对象中的响应[`Response`](https://developer.mozilla.org/en-US/docs/Web/API/Response)。

这是一个例子：

```go
// Copyright (C) 2020 Alessandro Segala (ItalyPaleAle)
// License: MIT

// MyGoFunc fetches an external resource by making a HTTP request from Go
// The JavaScript method accepts one argument, which is the URL to request
func MyGoFunc() js.Func {
	return js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		// Get the URL as argument
		// args[0] is a js.Value, so we need to get a string out of it
		requestUrl := args[0].String()

		// Handler for the Promise
		// We need to return a Promise because HTTP requests are blocking in Go
		handler := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
			resolve := args[0]
			reject := args[1]

			// Run this code asynchronously
			go func() {
				// Make the HTTP request
				res, err := http.DefaultClient.Get(requestUrl)
				if err != nil {
					// Handle errors: reject the Promise if we have an error
					errorConstructor := js.Global().Get("Error")
					errorObject := errorConstructor.New(err.Error())
					reject.Invoke(errorObject)
					return
				}
				defer res.Body.Close()

				// Read the response body
				data, err := ioutil.ReadAll(res.Body)
				if err != nil {
					// Handle errors here too
					errorConstructor := js.Global().Get("Error")
					errorObject := errorConstructor.New(err.Error())
					reject.Invoke(errorObject)
					return
				}

				// "data" is a byte slice, so we need to convert it to a JS Uint8Array object
				arrayConstructor := js.Global().Get("Uint8Array")
				dataJS := arrayConstructor.New(len(data))
				js.CopyBytesToJS(dataJS, data)

				// Create a Response object and pass the data
				responseConstructor := js.Global().Get("Response")
				response := responseConstructor.New(dataJS)

				// Resolve the Promise
				resolve.Invoke(response)
			}()

			// The handler of a Promise doesn't return any value
			return nil
		})

		// Create and return the Promise object
		promiseConstructor := js.Global().Get("Promise")
		return promiseConstructor.New(handler)
	})
}
```

然后，我们可以在 JavaScript 代码中使用它来调用任何 REST API 并获取结果，就好像它是一个`fetch`请求一样。例如，在下面的代码中，我们调用[taylor.rest](https://taylor.rest/) API，该 API 返回 Taylor Swift 的随机引用：

```js
async function MyFunc() {
    try {
        const response = await MyGoFunc('https://api.taylor.rest/')
        const message = await response.json()
        console.log(message)
    } catch (err) {
        console.error('Caught exception', err)
    }
}

/*
Result is a quote from Taylor Swift, as a JSON object. For example:
  {"quote":"The only one who's got enough of me to break my heart."}
*/
```

> 请注意，当从 Go 发出 HTTP 请求时，WebAssembly 运行时会在内部将调用转换为浏览器中的获取请求。因此，即使使用 WebAssembly，您仍然必须遵守与 JavaScript`fetch`调用相同的安全策略和要求，包括 CORS。

## 从 Go 代码流式传输

最后，还有一件事。我们已经了解了如何发出 HTTP 请求并从 WebAssembly/Go 返回数据。只有一个问题：

```go
data, err := ioutil.ReadAll(res.Body)
```

在这一行中，我们在内存中读取整个响应的主体，然后将其返回给 JavaScript。这在许多（大多数？）情况下都很好……但是如果您尝试读取一个非常大的文件（例如视频）怎么办？上面的调用需要大量内存。

值得庆幸的是，我们可以将响应传输回来。遗憾的是，由于 JavaScript 对流的支持相对不成熟（Node.js 之外），因此它并不那么简单。该解决方案涉及在 WebAssembly 代码中创建一个[`ReadableStream`](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream)JS 对象，然后使用其 API 在流中可用时立即传递数据。

```go
// Copyright (C) 2020 Alessandro Segala (ItalyPaleAle)
// License: MIT

// MyGoFunc fetches an external resource by making a HTTP request from Go
// The JavaScript method accepts one argument, which is the URL to request
func MyGoFunc() js.Func {
	return js.FuncOf(func(this js.Value, args []js.Value) interface{} {
		// Get the URL as argument
		// args[0] is a js.Value, so we need to get a string out of it
		requestUrl := args[0].String()

		// Handler for the Promise
		// We need to return a Promise because HTTP requests are blocking in Go
		handler := js.FuncOf(func(this js.Value, args []js.Value) interface{} {
			resolve := args[0]
			reject := args[1]

			// Run this code asynchronously
			go func() {
				// Make the HTTP request
				res, err := http.DefaultClient.Get(requestUrl)
				if err != nil {
					// Handle errors: reject the Promise if we have an error
					errorConstructor := js.Global().Get("Error")
					errorObject := errorConstructor.New(err.Error())
					reject.Invoke(errorObject)
					return
				}
				// We're not calling res.Body.Close() here, because we are reading it asynchronously

				// Create the "underlyingSource" object for the ReadableStream constructor
				// See: https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/ReadableStream
				underlyingSource := map[string]interface{}{
					// start method
					"start": js.FuncOf(func(this js.Value, args []js.Value) interface{} {
						// The first and only arg is the controller object
						controller := args[0]

						// Process the stream in yet another background goroutine,
						// because we can't block on a goroutine invoked by JS in Wasm
						// that is dealing with HTTP requests
						go func() {
							// Close the response body at the end of this method
							defer res.Body.Close()

							// Read the entire stream and pass it to JavaScript
							for {
								// Read up to 16KB at a time
								buf := make([]byte, 16384)
								n, err := res.Body.Read(buf)
								if err != nil && err != io.EOF {
									// Tell the controller we have an error
									// We're ignoring "EOF" however, which means the stream was done
									errorConstructor := js.Global().Get("Error")
									errorObject := errorConstructor.New(err.Error())
									controller.Call("error", errorObject)
									return
								}
								if n > 0 {
									// If we read anything, send it to JavaScript using the "enqueue" method on the controller
									// We need to convert it to a Uint8Array first
									arrayConstructor := js.Global().Get("Uint8Array")
									dataJS := arrayConstructor.New(n)
									js.CopyBytesToJS(dataJS, buf[0:n])
									controller.Call("enqueue", dataJS)
								}
								if err == io.EOF {
									// Stream is done, so call the "close" method on the controller
									controller.Call("close")
									return
								}
							}
						}()

						return nil
					}),
					// cancel method
					"cancel": js.FuncOf(func(this js.Value, args []js.Value) interface{} {
						// If the request is canceled, just close the body
						res.Body.Close()

						return nil
					}),
				}

				// Create a ReadableStream object from the underlyingSource object
				readableStreamConstructor := js.Global().Get("ReadableStream")
				readableStream := readableStreamConstructor.New(underlyingSource)

				// Create the init argument for the Response constructor
				// This allows us to pass a custom status code (and optionally headers and more)
				// See: https://developer.mozilla.org/en-US/docs/Web/API/Response/Response
				responseInitObj := map[string]interface{}{
					"status":     http.StatusOK,
					"statusText": http.StatusText(http.StatusOK),
				}

				// Create a Response object with the stream inside
				responseConstructor := js.Global().Get("Response")
				response := responseConstructor.New(readableStream, responseInitObj)

				// Resolve the Promise
				resolve.Invoke(response)
			}()

			// The handler of a Promise doesn't return any value
			return nil
		})

		// Create and return the Promise object
		// The Promise will resolve with a Response object
		promiseConstructor := js.Global().Get("Promise")
		return promiseConstructor.New(handler)
	})
}
```

的最后一次迭代`MyGoFunc(url)`可用于以流形式检索数据。例如，在 JavaScript 代码中，我们可以请求图像并看到它以块的形式到达：

```js
async function MyFunc() {
    try {
        const response = await MyGoFunc('https://images.unsplash.com/photo-1571079520814-c2840ce6ec7b')
        const reader = response.body.getReader()
        let done = false
        while (!done) {
            const read = await reader.read()
            done = read && read.done
            console.log('Read', read.value.length, 'bytes')
        }
    } catch (err) {
        console.error('Caught exception', err)
    }
}
```

当您调用此函数时，您将在控制台中看到一堆类似 的语句`Read 16384 bytes`，重复多次，有时具有不同的字节数，但永远不会大于 16384，因为我们使用的是 16KB 缓冲区。