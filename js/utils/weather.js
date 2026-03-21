let weatherCache = null
let lastFetch = 0

export async function getWeather(){

  const now = Date.now()

  if(weatherCache && now - lastFetch < 600000){
    return weatherCache
  }

  try{
    const res = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=45.46&longitude=9.19&current=temperature_2m"
    )

    const data = await res.json()

    const temp = Math.round(data?.current?.temperature_2m || 0)

    weatherCache = `🌤 ${temp}°`
    lastFetch = now

    return weatherCache

  }catch{
    return "☁️"
  }

}
