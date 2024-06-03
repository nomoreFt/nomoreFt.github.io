---
layout: post
title: "부록 - 하이버네이트 Bytecode Enhancement"
description: >
  하이버네이트 Bytecode Enhancement에 대해 알아보자.
image: /assets/img/study/jpa.jpg
categories: [ study,jpa ]
related_posts:

---

* toc
{:toc}

## 하이버네이트 Bytecode Enhancement
하이버네이트의 bytecode enhancement는 런타임 동안에 발생할 수 있는 다양한 작업들을 빌드 시간에 미리 처리함으로써, 런타임의 부담을 줄이고 성능을 개선해준다.<br>

예를 들어, 객체의 필드가 변경된 것을 미리 $$같은 코드를 생성해 놓음으로써, 런타임에 변경된 필드를 추적하는 작업을 줄여준다.<br> 
또는 컬럼 단위로 지연 로딩을 활성화 하는 등, 기존 엔티티 단위로 작동하던 프록시 기능을 필드 단위로 확장할 수 있다.<br>



### Bytecode Enhancement의 설정


~~~groovy
//file: `gradle bytecode enhancement 설정 예시`
plugins {
  id "org.hibernate.orm" version hibernateVersion
}

hibernate {
    enhance {
       enableLazyInitialization = true  // 지연 로딩 활성화
       enableDirtyTracking = true       // 변경 추적 활성화
       enableAssociationManagement = true
       enableExtendedEnhancement = false // 확장된 강화는 비활성화(필요에 따라)
    }
}
~~~

1. 지연 로딩 활성화 (Enable Lazy Initialization)
    - 자동 지연 로딩 활성화시킨다. 예를 들어 @OneToOne 연관관계에서 기본적으로 즉시 로딩(EAGER)이 발생하지만, 이 설정을 사용하면 굳이 명시하지 않아도 지연로딩으로 처리된다.
    - 컬럼 단위로 굳이 필요하지 않은 필드에 대한 지연 로딩을 활성화할 수 있다.
    - ex) 게시글에 이미지 파일이 있을 때, 이미지 파일을 불러오지 않는다면 지연 로딩을 활성화할 수 있다.

2. 변경 추적 (Dirty Tracking)
    - 영속성 컨텍스트에 많은 entity를 로드할 일 있으면 성능상 이점을 가져갈 수 있다.
    - 활성화 하지 않으면 특수한 설정을 하지 않는 이상 Entity 단위로 update한다.

3. 확장된 강화 비활성화 (Enable Extended Enhancement)
    - 엔티티 클래스 뿐만 아니라 다른 클래스에서도 바이트코드 향상을 적용할 수 있도록 확장.
    - 그러나 이 설정은 쓰지말길 권장한다. 성능 문제나 예상치 못한 동작을 초래할 수 있기 때문이다.

[바이트코드 향상 사용이 유의미한지 스택오버플로우 답변](https://stackoverflow.com/questions/58782057/is-it-worth-using-the-hibernate-bytecode-enhancement-mechanism)
{:.read-more}
---

#### GraalVM과 bytecode enhancement 함께 사용할 때 주의사항 
{:.read-more}

`hibernate.bytecode.provider=none` 설정을 통해 런타임 시에는 어떠한 bytecode 강화도 수행하지 않도록 설정할 수도 있다.<br>
-> Reflection같은 것들로 하이버네이트가 바이트코드를 조작해서 프록시를 생성, 필드 변경 추적 등을 하는데 그걸 하지 못하게 꺼버리는 설정이다.<br>
<br>

* 성능 저하 가능성 : 리플렉션을 사용하지 않기 때문에, 하이버네이트는 객체의 초기화나 데이터 접근에 있어서 더 많은 제약을 받게 되고, 이는 특히 지연 로딩이나 변경 감지와 같은 기능에서 성능 저하를 초래한다.
* GraalVM 최적화 : GraalVM 같은 환경에서는 런타임에 발생할 수 있는 동적인 변경을 최소화 하는 것이 성능에 유리하다. 따라서 이 설정은 GraalVM에서 어플리케이션의 시작 시간과 메모리 사용량을 줄이는데 도움이 되는 설정이다.

보통 클라우드에서 GraalVM을 쓰는 경우에 불필요한 리소스 사용을 줄이기 위해 런타임 때 낭비되는 자원을 최소화하기 위한 설정인 듯 하다.

   
---

#### 프록시 기반 vs bytecode enhancement
{:.read-more}

대표적으로 지연로딩 기능을 기반으로 비교해보자.<br>

**프록시 기반의 지연 로딩**

1. 엔티티 수준의 로딩
   - 프록시 객체를 사용하여 전체 엔티티를 대체한다. 실제 엔티티 데이터에 접근할 때 까지 데이터 로딩을 지연.
   - ex) `Customer` 엔티티에 `Order` 리스트가 있다면, `Order` 리스트에 처음 접근하는 시점에 전체 리스트가 로딩
2. 프록시 객체 생성
   - Hibernate는 프록시 객체를 생성하여 실제 엔티티를 감싸고, 이를 통해 데이터 접근을 제어한다.
   - 엔티티에 대한 참조가 요구될 때 까지 데이터베이스로부터 실제 데이터를 로드하지 않는다.

**bytecode enhancement를 통한 지연 로딩**

1. 속성 수준의 로딩
   - 특정 속성이나 필드 단위로 지연 로딩을 제어할 수 있다. 이는 프록시 기반 접근보다 더 세밀한 데이터 관리가 가능하다.
   - 예를 들어, `Customer` 엔티티의 `name`은 즉시 로드, `address` 는 필요할 때 로드되게 설정할 수 있다.
2. 바이트 코드 조작
   - 엔티티 클래스의 바이트코드를 조작하여 런타임 시 특정 동작을 추가한다. 이를 통해 특정 필드에 접근할 때만 데이터를 로드하는 등의 동작이 가능해진다.
   - 이 기술을 통해 생성되는 프록시는 Hibernate가 자동으로 관리, 사용자 코드에서 작동하는게 보인다.

---

### 결론

하이버네이트 3.x 버전에서 시작되어 2015년쯤 업그레이드된 5.x에서 부터 더욱 발전된 기능을 제공한다.<br>
꾸준히 더 좋은 기능으로 발전해왔고, 앞으로 더 편하고 좋은 기능을 제공할 것으로 보인다.<br>
사용하지 않는 경우 프록시 기반으로 엔티티 단위로 라이프사이클이나 로딩이 이루어지는데,<br>
bytecode enhancement는 설정만 잘 한다면 컬럼 단위로 지연 로딩을 활성화하거나, 변경 추적을 통해 성능을 개선할 수 있다.<br>

---
### 참고 
[jboss 하이버네이트 5.3 유저가이드](https://docs.jboss.org/hibernate/orm/5.3/userguide/html_single/chapters/pc/BytecodeEnhancement.html)

[dzone bytecode enhancement 작동원리](https://dzone.com/articles/hibernate-bytecode-enhancement-association-managem)
