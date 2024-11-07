# Json 反序列化 int64 精度丢失

测试阶段发现json转int64后部分精度有丢失，造成数据不一致，程序异常，提供错误案例以及如何正确使用

## **问题表现**

```Go
    var configDetailList []interface{}
	configStr, err := tccClient.Get(ctx, key)
	if err != nil {
		logs.CtxError(ctx, "get [config]:%s is err,err:%s", key, err)
		return configDetailList, nil
	}
 
	err = json.Unmarshal([]byte(configStr), &configDetailList)
	if err != nil {
		logs.CtxError(ctx, "json Unmarshal is err,serviceMeta:%s,err:%s", key, err)
		return configDetailList, uerr.SystemInternalError.WithMessage("tcc json Unmarshal is err")
	}
```

实际结果：

```json
{
    "key":"tenant_crowd_id_list",
    "field_meta_list":[
        {
            "key":"crowd_id",
            "type":"int64",
            "name":"圈人包id",
            "default_value":"1",
            "description":"圈人包id",
            "tenant_value":"71019664740587300000"
        }
    ],
    "name":"租户对应圈人包id list",
    "description":"租户对应圈人包id list"
}
```

预期结果 `tenant_value :710196647405873023890`

实际结果和预期结果相比精度损失几位，使得目标结果不正确造成程序异常

## 根本原因 

当数据结构未知，使用 `map[string]interface{}` 来接收反序列化结果时，如果数字的位数大于 6 位，都会变成科学计数法，用到的地方都会受到影响。
是因为当 JSON 中存在一个比较大的数字时，它会被解析成 float64 类型，就有可能会出现科学计数法的形式。

所以此问题在struct类型的时候不会出现，仅针对于[]interface{}

## 解决问题

可以使用Decode代替unmarshall来解决

```go
    var configDetailList []interface{}
	d := json.NewDecoder(bytes.NewReader([]byte(configStr)))
	d.UseNumber().              // 关键
	err = d.Decode(&configDetailList)
	if err != nil {
		logs.CtxError(ctx, "json Unmarshal is err,serviceMeta:%s,err:%s", key, err)
		return configDetailList, uerr.SystemInternalError.WithMessage("json Unmarshal is err")
	}
	if configDetailList == nil {
		configDetailList = make([]interface{}, 0)
	}
	return configDetailList, nil
```

json 库中 UseNumber 函数实现

```go
# file: src/encoding/json/stream.go

type Decoder struct {
	r       io.Reader
	buf     []byte
	d       decodeState
	scanp   int   // start of unread data in buf
	scanned int64 // amount of data already scanned
	scan    scanner
	err     error

	tokenState int
	tokenStack []int
}

// NewDecoder returns a new decoder that reads from r.
//
// The decoder introduces its own buffering and may
// read data from r beyond the JSON values requested.
func NewDecoder(r io.Reader) *Decoder {
	return &Decoder{r: r}
}

// UseNumber causes the Decoder to unmarshal a number into an interface{} as a
// Number instead of as a float64.
func (dec *Decoder) UseNumber() { dec.d.useNumber = true }


# file: src/encoding/json/decode.go

// convertNumber converts the number literal s to a float64 or a Number
// depending on the setting of d.useNumber.
func (d *decodeState) convertNumber(s string) (any, error) {
	if d.useNumber {
		return Number(s), nil
	}
	f, err := strconv.ParseFloat(s, 64)
	if err != nil {
		return nil, &UnmarshalTypeError{Value: "number " + s, Type: reflect.TypeOf(0.0), Offset: int64(d.off)}
	}
	return f, nil
}


// A Number represents a JSON number literal.
type Number string

// String returns the literal text of the number.
func (n Number) String() string { return string(n) }

// Float64 returns the number as a float64.
func (n Number) Float64() (float64, error) {
	return strconv.ParseFloat(string(n), 64)
}

// Int64 returns the number as an int64.
func (n Number) Int64() (int64, error) {
	return strconv.ParseInt(string(n), 10, 64)
}
```