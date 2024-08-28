#!/bin/bash

# How to:
#    curl -fsSL 'http://iskill.site/scripts/time.sh' | bash -C

function handle_log()
{
    #echo `date +%s.%N`
    if [ "${tag}" == "=" ];then
        reg="\<${key}=[1-9][0-9]*\>"
	split_tag="="
    elif [ "${tag}" == "[]" ];then
        #reg="\<${key}\[[1-9][0-9]*\]"
        reg="\<${key}\[[0-9]*.[0-9]*\]"
#\<NATIME\[[1-9][0-9]*\]
        #echo ${reg}
	#split_tag="[][]"
	split_tag="[][]"
    fi
    #echo ${reg}
    #echo ${split_tag}
    net=`grep "${reg}" $file`
    tm_count=`grep "${reg}" $file | wc -l`
    echo $tm_count
    tm_avg=`grep -o "${reg}" $file | awk -F"${split_tag}" -v count="$tm_count" '{ tm_avg+=$2 }END{ print 'tm_avg/count'}'`
    #echo $tm_avg
    for i in 0.5 0.75 0.8 0.9 0.95 0.99
    do
        location=$(echo ${i}*${tm_count} | bc | awk -F "." '{print $1}')
        percentile=`echo ${i}*100 | bc | awk -F "." '{print $1}'`
        eval P${percentile}_tm=`grep -o "${reg}" $file | awk -F"${split_tag}" '{print $2}' | sort -n | sed -n "${location}p"`
    done
    echo "AVG:${tm_avg}"
	echo "P50:${P50_tm}"
        echo "P75:${P75_tm}"
	echo "P80:${P80_tm}"
	echo "P90:${P90_tm}"
	echo "P95:${P95_tm}"
	echo "P99:${P99_tm}"
}

function main()
{
    if [ -f $file ];then
        handle_log
    else
        echo "file doesnot exit"
        exit 1
    fi
}

function usage()
{
    echo 'time.sh -f bs.gi.log -k key -t "="'
    echo 'time.sh -f bs.gi.log -k key -t "[]"'
}

tag="="

while getopts "f:k:t:h" Option
do
    case $Option in
        f ) file=$OPTARG;;
        k ) key=$OPTARG;;
        t ) tag=$OPTARG;;
        h ) usage; exit 1;;
        * ) usage; exit 1;;
    esac
done

if [  $# -lt 2 ]
then
    usage
    exit 1
fi

main