import requests
import json
from flask import Flask, request
from multiprocessing import cpu_count
from multiprocessing import Pool
app = Flask(__name__)

def get_access_token():
    """
    使用 API Key，Secret Key 获取access_token，替换下列示例中的应用API Key、应用Secret Key
    """
        
    url = "https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=YOUR_WENXIN_API_KEY&client_secret=YOUR_WENXIN_SECRET_KEY"
    
    payload = json.dumps("")
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    }
    
    response = requests.request("POST", url, headers=headers, data=payload)
    return response.json().get("access_token")


def main(message):
        
    url = "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/eb-instant?access_token=" + get_access_token()
    
    payload = json.dumps({
        "messages": [
            {
                "role": "user",
                "content": message
            }
        ]
    })
    headers = {
        'Content-Type': 'application/json'
    }
    
    response = requests.request("POST", url, headers=headers, data=payload)
    
    return  response.text
    

@app.route('/wenxinqianfan')
def wxqf():
    try:
        message1 = request.args["message"].replace('\'', '')
    except:
        head = []
    return json.loads(main(message1))["result"]
def fun2():
    num = cpu_count() - 6
    p = Pool(num)
    p.apply_async(wxqf)  # 异步提交func到一个子进程中执行
    p.close()  # 关闭进程池，用户不能再向这个池中提交任务了
    p.join()  # 阻塞直到进程池中所有的任务都被执行完
if __name__ == "__main__":
    app.run(host='0.0.0.0',port=5200)