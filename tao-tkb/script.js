const xlf = document.getElementById('xlf')
const btn = document.getElementById('submit')
const textInp = document.getElementById('text-input')
const alertEle = document.getElementById('alert-error')
const tableBody = document.getElementById('table-body')
const custLabel = document.querySelector('.custom-file-label')
xlf.addEventListener('change', e => handleFile(e.target.files[0]))
btn.addEventListener('click', e => process(data))

var data = null

function setDataTkb({ dataTkb, fileName }) {
  if (!dataTkb || !fileName) return

  data = dataTkb

  alertEle.style.display = 'none'
  custLabel.classList.remove('text-danger')
  custLabel.classList.add('text-success')
  custLabel.innerHTML = fileName
}

// check if a date is 3 months away from now
function isDateStale (dateString) {
  const noMonths = (date) => date.getFullYear() * 12 + date.getMonth()

  const today = new Date()
  const lastDay = new Date(dateString)
  return noMonths(today) - noMonths(lastDay) > 3
}

// check if cache data is valid (exists?, statle?)
function isCacheValid (domString) {
  if (!domString) return false // can't find cache data in localStorage
  const domData = JSON.parse(domString)
  return !isDateStale(domData[1]) // cache data is too old
}

// get cache data about class list
function checkCacheClassList() {
  const cachedClassList = localStorage.getItem('class-list')
  if (isCacheValid(cachedClassList)) {
    textInp.value = JSON.parse(cachedClassList)[0]
    if (data) process(data)
  }
}

// get cache data of file excel
const cachedFileExcel = localStorage.getItem('file-excel')
if (isCacheValid(cachedFileExcel)) {
  const dataTkb = JSON.parse(cachedFileExcel)[0]
  setDataTkb(dataTkb)
  checkCacheClassList()
} else {
  fetch('./tkb.json')
    .then(res => {
      if (res.ok) {
        return res.json()
      } else {
        throw new Error()
      }
    })
    .then(tkbJson => {
      setDataTkb({
        dataTkb: tkbJson.data,
        fileName: `Đang sử dụng TKB mặc định của server update vào lúc: <strong>${tkbJson['last-update']}</strong>`
      })
      checkCacheClassList()
    })
    .catch(err => console.log('Không tìm thấy tkb.json'))
}

/**
|--------------------------------------------------
| Data cache save:
| const cache = JSON.parse(localStorage.getItem(...))
| cache[0] is data
| cache[1] is last saved
|--------------------------------------------------
*/

// ================================ Upload file

function dataArrayToObject(array) {
  return {
    STT: array[0],
    MaMH: array[1],
    MaLop: array[2],
    TenMH: array[3],
    MaGV: array[4],
    TenGV: array[5],
    SiSo: array[6],
    SoTc: array[7],
    ThucHanh: array[8],
    HTGD: array[9],
    Thu: array[10],
    Tiet: array[11],
    CachTuan: array[12],
    PhongHoc: array[13],
    KhoaHoc: array[14],
    HocKy: array[15],
    NamHoc: array[16],
    HeDT: array[17],
    KhoaQL: array[18],
    NBD: array[19],
    NKT: array[20],
    GhiChu: array[21],
    NgonNgu: array[22]
  }
}

function filterBySchedule(data, toSchedule) {
  // 'data' là một mảng toàn bộ các LỚP HỌC PHẦN từ database
  // 'toSchedule' là mảng các MÃ LỚP HỌC PHẦN
  return data.filter(it => toSchedule.includes(it.MaLop));
}

function classifyBySchedulable(classes) {
  const schedulable = classes.filter(x => x.Thu !== '*')
  const unschedulable = classes.filter(x => x.Thu === '*')
  return { schedulable, unschedulable }
}

// =============================== Arrange schedule

function getClassCell({
  MaLop,
  NgonNgu,
  TenMH,
  TenGV = '',
  PhongHoc = '',
  NBD,
  NKT
}) {
  return `
    <strong>${MaLop} - ${NgonNgu}</strong><br>
    ${TenMH}<br>
    <strong>${TenGV}</strong><br>
    ${PhongHoc}<br>
    BĐ: ${NBD}<br>
    KT: ${NKT}<br>
  `
}

function handleSchedulable(processedData) {
  function getSchedulableCell(data) {
    return `
      <td rowspan="${data.Tiet.length}" class="class-center_white">
        ${getClassCell(data)}
      </td>
    `
  }
  function getLessonTime(tiet) {
    switch (tiet) {
      case 1:
        return `<td class="lesson-center_bold">Tiết 1<br>(7:30 - 8:15)</td>`
      case 2:
        return `<td class="lesson-center_bold">Tiết 2<br>(8:15 - 9:00)</td>`
      case 3:
        return `<td class="lesson-center_bold">Tiết 3<br>(9:00 - 9:45)</td>`
      case 4:
        return `<td class="lesson-center_bold">Tiết 4<br>(10:00 - 10:45)</td>`
      case 5:
        return `<td class="lesson-center_bold">Tiết 5<br>(10:45 - 11:30)</td>`
      case 6:
        return `<td class="lesson-center_bold">Tiết 6<br>(13:00 - 13:45)</td>`
      case 7:
        return `<td class="lesson-center_bold">Tiết 7<br>(13:45 - 14:30)</td>`
      case 8:
        return `<td class="lesson-center_bold">Tiết 8<br>(14:30 - 15:15)</td>`
      case 9:
        return `<td class="lesson-center_bold">Tiết 9<br>(15:30 - 16:15)</td>`
      case 10:
        return `<td class="lesson-center_bold">Tiết 10<br>(16:15 - 17:00)</td>`
    }
  }

  const listTiet = [...Array(10)].map((_, index) => {
    return processedData.schedulable.filter(x => x.Tiet.includes((index + 1) % 10))
  })

  // check trung tkb
  for (const arr of listTiet) {
    const listThu = arr.map(x => x.Thu)
    const listUniqueThu = new Set(listThu)
    const isUnique = listThu.length === listUniqueThu.size
    if (!isUnique) {
      const thuBug = listThu.find(x => listThu.count(x) > 1)
      const bugs = arr.filter(x => x.Thu === thuBug)
      const bugsDisplay = bugs.map(({MaLop, Thu, Tiet}) => `<strong>${MaLop}:Thứ${Thu}Tiết${Tiet}</strong>`)
      return {
        hasBug: true,
        message: `Trùng thời khóa biểu: ` + bugsDisplay.join(' - ') + '. '
      }
    }
  }

  let toAppend = ''
  for (let index = 0; index < 10; index++) {
    toAppend += `<tr>`
    toAppend += getLessonTime(index + 1)

    for (let thu = 2; thu <= 7; thu++) {
      const foundClass = listTiet[index].find(_class =>
        _class.Thu.includes(thu)
      )

      if (!foundClass) {
        toAppend += `<td></td>`
      } else {
        if (foundClass.Tiet[0] == index + 1) {
          toAppend += getSchedulableCell(foundClass)
        }
      }
    }

    toAppend += `</tr>`
  }
  tableBody.innerHTML += toAppend
  return { hasBug: false }
}

function handleUnschedulable(processedData) {
  function getUnschedulableCell(data) {
    return `
      <td colspan="7" class="class-center_white">
        ${getClassCell(data)}
      </td>
    `
  }

  const extraRows = processedData.unschedulable.map(item => {
    return `<tr>${getUnschedulableCell(item)}</tr>`
  })
  tableBody.innerHTML += extraRows.join('\n')
}

// ======================== main

function handleFile(file) {
  const reader = new FileReader()
  const rABS = !!reader.readAsBinaryString
  reader.onload = e => {
    const bstr = e.target.result
    const wb = XLSX.read(bstr, { type: rABS ? 'binary' : 'array' })
    const wsLyThuyet = wb.Sheets[wb.SheetNames[0]]
    const wsThucHanh = wb.Sheets[wb.SheetNames[1]]
    const dataLyThuyet = XLSX.utils.sheet_to_json(wsLyThuyet, { header: 1 })
    const dataThucHanh = XLSX.utils.sheet_to_json(wsThucHanh, { header: 1 })
    const dataInArray = [...dataLyThuyet, ...dataThucHanh].filter(
      row => typeof row[0] === 'number'
    )

    const tkb = {
      dataTkb: dataInArray.map(array => dataArrayToObject(array)),
      fileName: file.name
    }
    setDataTkb(tkb)
    localStorage.setItem('file-excel', JSON.stringify([tkb, (new Date()).toLocaleString()]))
  }
  if (rABS) reader.readAsBinaryString(file)
  else reader.readAsArrayBuffer(file)
}

// https://stackoverflow.com/a/6121234/9787887
Object.defineProperties(Array.prototype, {
  count: {
    value: function(value) {
      return this.filter(x => x == value).length
    }
  }
})

function checkTrungMaMH (filteredClasses) {
  const verifyStrings = filteredClasses.map(x => x.MaMH + x.HTGD + x.Thu + x.Tiet)
  const uniqueStrings = new Set(verifyStrings)
  const isUnique = verifyStrings.length === (uniqueStrings).size
  if (!isUnique) {
    const bugs = verifyStrings.filter(x => verifyStrings.count(x) > 1)
    return {
      hasBug: true,
      message: `Trùng mã môn học cho lớp: <strong>` + bugs.join(', ') + '</strong>. '
    }
  } else {
    return {
      hasBug: false
    }
  }
}

function alertError (message) {
  const linkGithub = 'https://github.com/loia5tqd001/Dang-Ky-Hoc-Phan-UIT/issues'
  const reportBugStr = `Nếu bạn thấy lỗi là do chương trình vui lòng báo lỗi <a href="${linkGithub}" target="_blank" class="alert-link">tại đây</a>`
  alertEle.innerHTML = message + reportBugStr
  alertEle.style.display = 'block'
  return
}

function process (dataInObject) {
  tableBody.innerHTML = ''
  
  if (dataInObject === null) {
    return alertError('Có vẻ như bạn chưa tải file excel dữ liệu TKB của trường (ở bước 1) lên. ')
  }
  localStorage.setItem('class-list', JSON.stringify([textInp.value, (new Date().toLocaleString())]))
  const toSchedule = textInp.value.toUpperCase().split('\n').map(s => s.trim()).filter(s => s !== '')
  
  const filteredClasses = filterBySchedule(dataInObject, toSchedule)
  if (filteredClasses.length === 0) {
    return alertError('Không tìm thấy mã lớp học nào hợp lệ cho bạn! Bạn kiểm tra kĩ chưa? ')
  } 
  else {
    const { hasBug, message } = checkTrungMaMH(filteredClasses)
    if (hasBug) {
      return alertError(message)
    }
  }
  const processedData = classifyBySchedulable(filteredClasses)
  const { hasBug, message } = handleSchedulable(processedData)
  if (hasBug) {
    return alertError(message)
  }
  handleUnschedulable(processedData)

  const cantSchedule = toSchedule.filter(it => !filteredClasses.map(x => x.MaLop).includes(it))
  if (cantSchedule.length === 0) {
    alertEle.style.display = 'none'
  } else {
    const listCantFind = toSchedule.filter(x => !filteredClasses.find(({MaLop}) => MaLop === x))
    const styledListCantFind = listCantFind.map(x => `<strong>${x}</strong>`)
    const message = `Không thể xếp lịch cho các mã lớp: ${styledListCantFind.join(', ')}. `
    alertError(message)
  }
}
