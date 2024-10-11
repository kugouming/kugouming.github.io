# Crontab 表达式解析实例

> **重点：** 基于表达式解析出时间序列，然后基于当前时间向后查找到能符合该时间序列的时间点！！！

在Go语言中，我们可以使用time包来处理时间，以及使用strings和strconv包来解析Crontab表达式。以下是一个简单的Go程序，用于生成Crontab规则 `*/5 * * * *` 的时间序列。

```go
package main

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// 解析Crontab表达式中的单个字段
func parseField(field string, start, max int) []int {
	var values []int
	for _, part := range strings.Split(field, ",") {
		rangeParts := strings.Split(part, "-")
		if len(rangeParts) == 1 {   // 单值判断
			if part == "*" { // 所有区间值均追加到集合
				for i := 0; i < max; i++ {
					values = append(values, i)
				}
			} else {         // 仅将指定值追加到集合
				value, _ := strconv.Atoi(part)
				values = append(values, value)
			}
		} else {                   // 区间判断
			startValue, _ := strconv.Atoi(rangeParts[0])
			endValue, _ := strconv.Atoi(rangeParts[1])
			for i := startValue; i <= endValue; i++ {
				values = append(values, i)
			}
		}
	}
	
	// 过滤掉不在开始和结束时间范围内的值
	filtered := make([]int, 0)
	for _, value := range values {
		if value >= start && value < max {
			filtered = append(filtered, value)
		}
	}
	return filtered
}

// 生成下一个运行时间
func generateNextRunTime(cron string) time.Time {
	fields := strings.Split(cron, " ")
	var nextTime time.Time
	var err error

	if len(fields) != 5 {
		panic("Invalid cron format")
	}

	// 解析每个字段
	minutes := parseField(fields[0], 0, 60)
	hours   := parseField(fields[1], 0, 24)
	days    := parseField(fields[2], 1, 31)
	months  := parseField(fields[3], 1, 12)

	// 星期几字段特殊处理，因为星期天既可以是0也可以是7
	var daysOfWeek []int
	if fields[4] == "7" {
		daysOfWeek = append(daysOfWeek, 0)
	} else {
		daysOfWeek = parseField(fields[4], 0, 7)
	}

	// 获取当前时间
	now := time.Now()

	// 尝试找到下一个运行时间
	for {
		nextTime = time.Date(now.Year(), now.Month(), now.Day(), 15, 0, 0, 0, time.Local)
		// 增加5分钟的间隔，因为Crontab是每5分钟执行一次
		nextTime = nextTime.Add(5 * time.Minute)

		// 检查分钟是否匹配
		minute := nextTime.Minute()
		if contains(minutes, minute) {
			// 检查小时是否匹配
			hour := nextTime.Hour()
			if contains(hours, hour) {
				// 检查天是否匹配
				day := nextTime.Day()
				if contains(days, day) {
					// 检查月份是否匹配
					month := int(nextTime.Month())
					if contains(months, month) {
						// 检查星期是否匹配
						weekday := nextTime.Weekday()
						if contains(daysOfWeek, int(weekday)) {
							return nextTime
						}
					}
				}
			}
		}
		// 如果没有匹配，增加5分钟再次检查
		nextTime = nextTime.Add(5 * time.Minute)
	}
}

// 检查值是否存在于切片中
func contains(slice []int, val int) bool {
	for _, item := range slice {
		if item == val {
			return true
		}
	}
	return false
}

func main() {
	cron := "*/5 * * * *" // 每5分钟执行一次
	nextRunTime := generateNextRunTime(cron)
	fmt.Printf("The next run time is: %v\n", nextRunTime)
}
```

这个程序定义了 `parseField` 函数来解析Crontab表达式中的单个字段，并返回一个包含所有可能值的切片。`generateNextRunTime` 函数尝试找到下一个匹配Crontab规则的时间点。`contains` 函数用于检查一个值是否存在于一个整数切片中。

请注意，这个示例程序仅处理了简单的Crontab表达式，并且没有处理所有可能的边界情况和特殊字符（如L、W、#等）。对于更复杂的Crontab表达式，需要扩展解析逻辑。此外，这个程序假设Crontab表达式总是有效的，并且没有错误处理机制来处理无效的表达式。在实际应用中，你可能需要添加错误处理来提高程序的健壮性。