---
layout: post
title: "[부록 1] JPA 기본 사항[작성중]"
description: >
    JPA의 기본 사항을 정리한다.
image: /assets/img/study/jpa.jpg
categories: [study,jpa]
related_posts:
  
---
* toc
{:toc}

## 영속성 유닛(Persistence Unit)

EntityManagerFactory 인스턴스를 생성할 때 필요한 설정 정보를 모아둔 상자이다.<br>

스프링 부트에서는 yml, properties 파일을 활용해 `영속성 유닛`을 대신 생성한다.<br><br>

**관리되는 정보**
* DataSource(JDBC URL, 사용자, 패스워드, SQL Dialect)
* 관리되는 엔티티 클래스 목록
* 기타 속성에 대한 세부 정보

<br>

> 하나의 App은 여러 개의 영속성 유닛을 갖고 이름으로 식별 가능하다. <br>
> 동일한 App에서 여러 DB에 연결할 수 있다.

~~~yml
//file: `스프링부트 영속성 유닛 설정`

# file: application.yml

spring:
  datasource:
    primary:
      url: jdbc:mysql://localhost:3306/primarydb
      username: primaryuser
      password: primarypass
      driver-class-name: com.mysql.jdbc.Driver
    secondary:
      url: jdbc:mysql://localhost:3306/secondarydb
      username: secondaryuser
      password: secondarypass
      driver-class-name: com.mysql.jdbc.Driver

  jpa:
    hibernate:
      ddl-auto: update
    show-sql: true

    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQL5Dialect

# JPA 설정은 각각의 데이터 소스에 따라 다르게 구성할 수 있습니다.
# 아래는 `primary` 데이터 소스의 EntityManager 설정입니다.
primary:
  jpa:
    show-sql: true
    hibernate:
      ddl-auto: update
      naming-strategy: org.hibernate.cfg.ImprovedNamingStrategy
      dialect: org.hibernate.dialect.MySQL5Dialect

# `secondary` 데이터 소스에 대한 EntityManager 설정
secondary:
  jpa:
    show-sql: true
    hibernate:
      ddl-auto: validate
      naming-strategy: org.hibernate.cfg.EJB3NamingStrategy
      dialect: org.hibernate.dialect.MySQL5InnoDBDialect

~~~

<br>

```java
@Configuration
public class DataSourceConfig {

    @Primary
    @Bean(name = "primaryDataSource")
    @ConfigurationProperties(prefix = "spring.datasource.primary")
    public DataSource primaryDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Bean(name = "secondaryDataSource")
    @ConfigurationProperties(prefix = "spring.datasource.secondary")
    public DataSource secondaryDataSource() {
        return DataSourceBuilder.create().build();
    }

    @Primary
    @Bean(name = "transactionManagerPrimary")
    public PlatformTransactionManager transactionManagerPrimary(EntityManagerFactoryBuilder builder) {
        return new JpaTransactionManager(entityManagerFactoryPrimary(builder).getObject());
    }

    @Bean(name = "transactionManagerSecondary")
    public PlatformTransactionManager transactionManagerSecondary(EntityManagerFactoryBuilder builder) {
        return new JpaTransactionManager(entityManagerFactorySecondary(builder).getObject());
    }

    @Primary
    @Bean(name = "entityManagerFactoryPrimary")
    public LocalContainerEntityManagerFactoryBean entityManagerFactoryPrimary(EntityManagerFactoryBuilder builder) {
        return builder
                .dataSource(primaryDataSource())
                .packages("com.example.domain.primary")  // Manage entities under this package for primary
                .persistenceUnit("primary")
                .build();
    }

    @Bean(name = "entityManagerFactorySecondary")
    public LocalContainerEntityManagerFactoryBean entityManagerFactorySecondary(EntityManagerFactoryBuilder builder) {
        return builder
                .dataSource(secondaryDataSource())
                .packages("com.example.domain.secondary")  // Manage entities under this package for secondary
                .persistenceUnit("secondary")
                .build();
    }
}

```

---

## 엔티티 매니저 팩토리(EntityManagerFactory)

`EntityManagerFactory`는 `EntityManager` 인스턴스를 생성하는 팩토리 객체이다.<br>
온디멘드(on-demand) 방식으로 영속성 유닛이 제공된 정보를 바탕으로 호출될 때 마다 `createEntityManager()` 메서드로 `EntityManager` 인스턴스를 생성한다.<br>

* 온디멘드(on-demand) 방식: 필요할 때 생성되는 방식


---

## 엔티티 매니저(EntityManager)

### 엔티티 매니저의 기본적인 동작
* DB에서 데이터를 가져오면, 메모리 (1차 캐시) 에 복사본 (데이터 스냅샷)을 만든다.<br>
* 영속성 콘텍스트당 하나의 활성화된 DB 트랜잭션을 가진다.<br>
* DB 트랜잭션이 활성화 되있는 동안, EntityManager를 통해 엔티티를 조작한다.
* 엔티티 찾기, 유지 및 병합, 제거 등과 같은 작업을 버퍼링한다.
* 플러시 작업 : 수정 사항을 전파하고자 DB로 전송하는 SQL 묶음이다.
* 트랜잭션이 커밋 또는 롤백으로 완료되면 모든 엔티티는 detached 된다.
* 추가적인 수정사항이 있으면 활성화된 영속성 컨텍스트에서 merge를 하거나 reattaching을 해야한다.

> 보통은 DB 물리적 트랜잭션당 하나 이상의 영속성 콘텍스트는 사용되지 않는다.

### 영속성 컨텍스트의 역할은?
  * 영속성 컨텍스트는 엔티티 캐시 뿐 아니라 상태 전환에 대한 버퍼, 트랜잭션 쓰기 지연 캐시 역할도 한다.<br>
  * Flush 시점에 영속화되어 있으면서 변경된 엔티티의 상태 전환을 DB와 동기화하기 위해 DML 구문으로 변경하는 역할을 한다.

### JPA 병합(merge)과 하이버네이트 재결합(reattaching)의 차이점

#### JPA 병합(Merge)
**JPA의 merge()** 메서드는 데이터베이스의 최신 정보와 분리된(detached) 상태의 엔티티를 동기화하는 작업을 수행한다.<br>
이 과정에서 엔티티의 내부 상태를 새로운 영속성 상태의 엔티티에 복사하여 업데이트한다.<br>
만약 병합하려는 엔티티가 이미 영속성 콘텍스트에 관리되고 있다면, JPA는 데이터베이스 조회를 생략하고 세션 수준에서의 반복 읽기를 수행하여 성능을 최적화한다.<br>
<br>
> JPA Merge 사용 이유?

* JPA merge()는 데이터 일관성을 유지하면서 필요한 경우만 데이터베이스와의 동기화를 진행한다.
* 때문에, 분리된 엔티티를 다시 영속 상태로 복구할 때 유용하다.
* 이 메서드는 클라이언트에서 수정된 엔티티를 서버로 다시 전송할 때 변경된 정보만 데이터베이스에 반영하도록 도와준다.

<br>

#### 하이버네이트 재결합(Reattaching)

**하이버네이트의 재결합**은 update() 메서드를 통해 수행된다.<br>
이 메서드는 detached 상태의 엔티티를 영속성 콘텍스트에 다시 연결하는 작업을 의미한다.<br>
하이버네이트는 이 경우, transient 상태의 엔티티나 이미 존재하는 영속성 엔티티에 대해서는 예외를 발생시킨다.<br>
update()는 더티 체킹을 실행하지 않고, 플러시 시점에 바로 업데이트 쿼리를 실행해버린다.<br>
-> @SelectBeforeUpdate 어노테이션을 사용하면 엔티티의 변경 여부를 확인하기 위해 업데이트 전에 더티 체킹을 수행할 수 있다.<br>

> 사용 이유

* 하이버네이트의 update()는 배치 처리 작업이나 대량의 데이터를 빠르게 업데이트 해야 할 때 유용하다.<br>
* 이 메서드는 데이터베이스의 최신 상태를 무시하고 엔티티의 현재 상태를 강제로 반영하고자 할 때 선택적으로 사용된다.<br>


#### 추천 사용법

* 엔티티의 상태를 복구하고자 할 때: JPA의 merge() 메서드를 사용하라. 이는 클라이언트에서 반환된 엔티티가 서버와 동기화되어야 할 경우에 특히 유용하다.
* 배치 처리나 대량 업데이트가 필요할 때: 하이버네이트의 update() 메서드가 적합합다. 이는 서버의 현재 상태를 무시하고 클라이언트의 변경 사항을 강제로 반영할 수 있다.
* 새로운 엔티티를 저장하려 할 때: JPA의 persist() 메서드를 사용하라. 이 메서드는 새로운 엔티티를 영속성 콘텍스트에 추가하고, 데이터베이스에 반영하도록 도와준다.

<br><br>

## JPA 엔티티의 생명주기와 상태 이해하기


1. Transient (일시적 상태)
   * 정의: 엔티티가 새로 생성되어 아직 영속성 컨텍스트(persistence context)에 속하지 않는 상태.
   * 특징: 이 상태의 엔티티는 데이터베이스에 저장되지 않았으며, JPA가 관리하지 않는다. 따라서 EntityManager에 의해 추적되거나 데이터베이스와 동기화되지 않는다.
   * 전환 방법: persist() 메서드를 호출하여 엔티티를 영속 상태로 전환.

> Transient -> Managed 로 갈 때 변경된 엔티티는 INSERT문으로 변환

2. Managed (관리 상태)
   * 정의: 엔티티가 영속성 컨텍스트에 저장되고 JPA에 의해 관리되는 상태.
   * 특징: 이 상태의 엔티티는 데이터베이스와 동기화되어 있으며, JPA가 자동으로 변경 사항을 감지하고 데이터베이스에 반영(더티 체킹).
   * 전환 방법: persist(), merge(), 또는 조회(find(), query 등)를 통해 엔티티를 이 상태로 전환.

> Managed 엔티티가 수정되면 더티체킹으로 UPDATE<br>
> Managed -> Removed 로 갈 때 변경된 엔티티는 DELETE문으로 변환

3. Detached (분리 상태)
   * 정의: 엔티티가 영속성 컨텍스트에서 분리되어 더 이상 JPA에 의해 관리되지 않는 상태.
   * 특징: 이 상태의 엔티티는 더 이상 영속성 컨텍스트와 동기화되지 않는다. 그러나 엔티티 자체는 여전히 데이터베이스에 존재.
   * 전환 방법: detach(), clear(), close() 메서드를 사용하거나 영속성 컨텍스트가 종료되면 엔티티는 자동으로 분리.
4. Removed (삭제 상태)
   * 정의: 엔티티가 삭제되기로 표시된 상태로, 영속성 컨텍스트는 이 엔티티를 데이터베이스에서 삭제하기 위해 표시.
   * 특징: 이 상태의 엔티티는 아직 데이터베이스에서 삭제되지 않았지만, 다음 트랜잭션 커밋 시 삭제될 예정.
   * 전환 방법: remove() 메서드를 호출하여 엔티티를 삭제 상태로 전환.






