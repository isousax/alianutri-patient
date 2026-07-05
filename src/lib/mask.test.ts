import { describe, it, expect } from 'vitest'
import { maskBirthDate, brDateToISO, maskCpf, maskPhone, digitsOnly } from './mask'

describe('maskBirthDate', () => {
  it('aplica DD/MM/AAAA progressivamente', () => {
    expect(maskBirthDate('0')).toBe('0')
    expect(maskBirthDate('08')).toBe('08')
    expect(maskBirthDate('083')).toBe('08/3')
    expect(maskBirthDate('0803')).toBe('08/03')
    expect(maskBirthDate('08031')).toBe('08/03/1')
    expect(maskBirthDate('08031990')).toBe('08/03/1990')
  })

  it('ignora não-dígitos e limita a 8 dígitos', () => {
    expect(maskBirthDate('08a03b1990')).toBe('08/03/1990')
    expect(maskBirthDate('080319901234')).toBe('08/03/1990')
  })
})

describe('brDateToISO', () => {
  it('converte DD/MM/AAAA em AAAA-MM-DD', () => {
    expect(brDateToISO('08/03/1990')).toBe('1990-03-08')
    expect(brDateToISO('08031990')).toBe('1990-03-08')
  })

  it("retorna '' para data incompleta", () => {
    expect(brDateToISO('08/03/19')).toBe('')
    expect(brDateToISO('')).toBe('')
  })

  it("retorna '' para data impossível ou mês/dia inválidos", () => {
    expect(brDateToISO('31/02/2020')).toBe('') // 31 de fevereiro
    expect(brDateToISO('00/00/0000')).toBe('')
    expect(brDateToISO('32/13/1990')).toBe('')
  })

  it('aceita 29/02 em ano bissexto e rejeita em não-bissexto', () => {
    expect(brDateToISO('29/02/2024')).toBe('2024-02-29')
    expect(brDateToISO('29/02/2025')).toBe('')
  })
})

describe('maskCpf', () => {
  it('aplica 000.000.000-00 progressivamente', () => {
    expect(maskCpf('123')).toBe('123')
    expect(maskCpf('1234')).toBe('123.4')
    expect(maskCpf('1234567')).toBe('123.456.7')
    expect(maskCpf('12345678901')).toBe('123.456.789-01')
  })

  it('limita a 11 dígitos e ignora não-dígitos', () => {
    expect(maskCpf('123.456.789-0123')).toBe('123.456.789-01')
  })
})

describe('maskPhone', () => {
  it('formata celular de 11 dígitos', () => {
    expect(maskPhone('11987654321')).toBe('(11) 98765-4321')
  })

  it('formata fixo de 10 dígitos', () => {
    expect(maskPhone('1133334444')).toBe('(11) 3333-4444')
  })

  it('progressivo e limitado a 11 dígitos', () => {
    expect(maskPhone('1')).toBe('(1')
    expect(maskPhone('11')).toBe('(11')
    expect(maskPhone('119')).toBe('(11) 9')
    expect(maskPhone('119876543219999')).toBe('(11) 98765-4321')
  })
})

describe('digitsOnly', () => {
  it('remove tudo que não for dígito', () => {
    expect(digitsOnly('(11) 98765-4321')).toBe('11987654321')
    expect(digitsOnly('123.456.789-01')).toBe('12345678901')
    expect(digitsOnly('abc')).toBe('')
  })
})
